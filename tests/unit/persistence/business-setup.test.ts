import type { Membership, PrismaClient } from '../../../src/generated/prisma/client';
import { MembershipRole, MembershipStatus } from '../../../src/generated/prisma/enums';
import { createBusinessWithOwner } from '../../../src/persistence/repositories/business-setup.repository';
import { BusinessRepository } from '../../../src/persistence/repositories/business.repository';
import { MembershipRepository } from '../../../src/persistence/repositories/membership.repository';
import type { Db } from '../../../src/persistence/types';

const businessId = '00000000-0000-4000-8000-000000000001';
const actorUserId = '00000000-0000-4000-8000-000000000002';

function membership(id: string, role: MembershipRole, userId = actorUserId): Membership {
  return {
    id,
    userId,
    businessId,
    role,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    deactivatedAt: null,
  };
}

function repository(db: Record<string, unknown>) {
  return new MembershipRepository(
    db as unknown as Db,
    { businessId },
    { inTransaction: true },
  );
}

describe('membership setup persistence', () => {
  it('creates a business, owner membership, and audit entries in one transaction', async () => {
    const business = { id: businessId, name: 'Test business', isSolo: true };
    const owner = membership('owner-membership', MembershipRole.OWNER);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: actorUserId }]),
      business: { create: jest.fn().mockResolvedValue(business) },
      membership: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(owner),
      },
      auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: jest.fn(
        (run: (client: typeof tx) => Promise<unknown>) => run(tx),
      ),
    } as unknown as PrismaClient;

    await expect(
      createBusinessWithOwner(prisma, {
        ownerUserId: actorUserId,
        name: business.name,
        isSolo: business.isSolo,
      }),
    ).resolves.toMatchObject({ status: 'created', business, ownerMembership: owner });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([
        expect.objectContaining({ action: 'BUSINESS_CREATED' }),
        expect.objectContaining({ action: 'MEMBER_JOINED' }),
      ]) }),
    );
  });

  it('updates solo state under the business lock and returns member and cash-up counts', async () => {
    const business = { id: businessId, name: 'Test business', isSolo: false };
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: businessId }]),
      business: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(business)
          .mockResolvedValueOnce({ ...business, isSolo: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      membership: { count: jest.fn().mockResolvedValue(2) },
      cashUp: { count: jest.fn().mockResolvedValue(3) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const repository = new BusinessRepository(
      db as unknown as Db,
      { businessId },
      { inTransaction: true },
    );

    await expect(repository.setBusinessSolo(true, actorUserId)).resolves.toMatchObject({
      status: 'updated',
      business: { isSolo: true },
      otherActiveMemberCount: 2,
      unresolvedCashUpCount: 3,
    });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.business.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: businessId, isSolo: false } }),
    );
  });

  it('locks the business and returns a typed result when the last active owner is deactivated', async () => {
    const owner = membership('owner-membership', MembershipRole.OWNER);
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: businessId }]),
      business: { findUnique: jest.fn().mockResolvedValue({ id: businessId }) },
      membership: {
        findFirst: jest.fn().mockResolvedValue(owner),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn(),
      },
    };

    await expect(
      repository(db).setMemberStatus(owner.id, MembershipStatus.INACTIVE, actorUserId),
    ).resolves.toEqual({ status: 'last_active_owner' });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.membership.updateMany).not.toHaveBeenCalled();
  });

  it('demotes the current manager before promoting the new manager and writes both audit rows', async () => {
    const oldManager = membership('old-manager', MembershipRole.MANAGER);
    const newManager = membership('new-manager', MembershipRole.STAFF, 'new-user');
    const updateOrder: string[] = [];
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: businessId }]),
      business: { findUnique: jest.fn().mockResolvedValue({ id: businessId }) },
      cashUp: { count: jest.fn().mockResolvedValue(0) },
      membership: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(oldManager)
          .mockResolvedValueOnce(newManager)
          .mockResolvedValueOnce({ ...oldManager, role: MembershipRole.STAFF })
          .mockResolvedValueOnce({ ...newManager, role: MembershipRole.MANAGER }),
        updateMany: jest.fn(async ({ where }: { where: { id: string } }) => {
          updateOrder.push(where.id);
          return { count: 1 };
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const result = await repository(db).replaceManager(newManager.userId, actorUserId);

    expect(result).toMatchObject({
      status: 'replaced',
      oldManagerUnresolvedCashUpCount: 0,
    });
    expect(updateOrder).toEqual([oldManager.id, newManager.id]);
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);
  });
});
