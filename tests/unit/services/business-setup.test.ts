import { createHash } from 'node:crypto';
import type { Business, JoinCode, Membership } from '../../../src/generated/prisma/client';
import { MembershipRole, MembershipStatus } from '../../../src/persistence';
import { ACTOR_BRAND } from '../../../src/services/actor';
import type { Actor } from '../../../src/services/actor';
import { BusinessSetupService } from '../../../src/services/business-setup.service';
import { BusinessRuleError, ConflictError, ForbiddenError } from '../../../src/services/errors';
import { markTransactionRepositories, type ServiceRepositories } from '../../../src/services/ports';
import { UseCaseRunner } from '../../../src/services/use-case-runner';
import { serviceRepositories, type ServiceRepositoryOverrides } from './service-repositories';

const userId = 'cfd0db5d-cd96-4f5c-bb34-88d08e0748a8';
const businessId = '02d32eae-21cb-497f-86e4-8a2df9e469f8';
const ownerMembershipId = '4c9c5415-0cc5-427d-8a61-64829c6de50c';
const managerMembershipId = 'e2461a3b-6449-4dfb-94b6-aed839bac5aa';
const now = new Date('2026-11-05T00:00:00.000Z');

const business: Business = {
  id: businessId,
  name: 'CashUp',
  isSolo: false,
  createdAt: now,
  updatedAt: now,
};

function actor(role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER'): Actor {
  return {
    userId,
    membershipId: ownerMembershipId,
    businessId,
    role,
    [ACTOR_BRAND]: true,
  };
}

function member(overrides: Partial<Membership> & { user?: { id: string; email: string; fullName: string } } = {}) {
  const { user, ...membershipOverrides } = overrides;
  return {
    id: ownerMembershipId,
    userId,
    businessId,
    role: MembershipRole.STAFF,
    status: MembershipStatus.ACTIVE,
    joinedAt: now,
    deactivatedAt: null,
    ...membershipOverrides,
    user: user ?? { id: userId, email: 'user@example.test', fullName: 'Test user' },
  };
}

function joinCode(overrides: Partial<JoinCode> = {}): JoinCode {
  return {
    id: managerMembershipId,
    businessId,
    codeHash: 'stored-hash',
    role: MembershipRole.STAFF,
    createdByUserId: userId,
    expiresAt: new Date('2026-11-12T00:00:00.000Z'),
    maxUses: 1,
    usedCount: 0,
    revokedAt: null,
    createdAt: now,
    ...overrides,
  };
}

function service(
  repositoryOverrides: ServiceRepositoryOverrides = {},
  persistenceOverrides: Partial<ConstructorParameters<typeof BusinessSetupService>[1]> = {},
) {
  const repositories = serviceRepositories(repositoryOverrides);
  const runner = new UseCaseRunner({
    run: async <T>(
      _scope: { businessId: string },
      callback: (repos: ServiceRepositories) => Promise<T>,
    ) => callback(markTransactionRepositories(repositories)),
  });
  const persistence: ConstructorParameters<typeof BusinessSetupService>[1] = {
    createBusinessWithOwner: async () => ({ status: 'user_not_found' }),
    redeemJoinCodeByHash: async () => ({ status: 'not_found' }),
    ...persistenceOverrides,
  };
  return {
    repositories,
    persistence,
    service: new BusinessSetupService(runner, persistence),
  };
}

describe('BusinessSetupService', () => {
  it('creates a business for an unattached user and conflicts if the user already belongs to one', async () => {
    const rootMembership: Membership = {
      id: ownerMembershipId,
      userId,
      businessId,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: now,
      deactivatedAt: null,
    };
    const created = service({}, {
      createBusinessWithOwner: async () => ({
        status: 'created',
        business,
        ownerMembership: rootMembership,
      }),
    });

    await expect(
      created.service.createBusiness(userId, { name: 'CashUp', isSolo: false }),
    ).resolves.toEqual({ id: businessId, name: 'CashUp', isSolo: false, role: 'OWNER' });
    const existing = service({}, {
      createBusinessWithOwner: async () => ({
        status: 'user_already_belongs_to_a_business',
      }),
    });
    await expect(
      existing.service.createBusiness(userId, { name: 'CashUp', isSolo: false }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ALREADY_EXISTS' });
  });

  it('reads business details and lists members without exposing user or business identifiers', async () => {
    const currentMember = member();
    const setup = service({
      businesses: { getBusiness: async () => business },
      memberships: { listMembers: async () => [currentMember] },
    });
    const currentActor = actor();

    await expect(setup.service.getBusiness(currentActor)).resolves.toEqual({
      id: businessId,
      name: business.name,
      isSolo: false,
      role: 'OWNER',
    });
    const members = await setup.service.listMembers(currentActor);
    expect(members).toEqual([
      {
        id: ownerMembershipId,
        fullName: 'Test user',
        role: MembershipRole.STAFF,
        status: MembershipStatus.ACTIVE,
        joinedAt: now.toISOString(),
        deactivatedAt: null,
      },
    ]);
    expect(JSON.stringify(members)).not.toMatch(/userId|businessId/);
  });

  it('deactivates an eligible staff member but blocks self-deactivation and unresolved cash-ups', async () => {
    const target = member({ id: managerMembershipId, userId: 'target-user' });
    const setup = service({
      businesses: { lockBusiness: async () => business },
      memberships: {
        getMember: async () => target,
        setMemberStatus: async () => ({ status: 'updated', member: { ...target, status: 'INACTIVE' } }),
      },
      cashUps: { countUnresolvedCashUpsForUser: async () => 0 },
    });
    await expect(
      setup.service.deactivateMember(actor(), managerMembershipId),
    ).resolves.toMatchObject({ id: managerMembershipId, status: 'INACTIVE' });

    const unresolved = service({
      businesses: { lockBusiness: async () => business },
      memberships: { getMember: async () => target },
      cashUps: { countUnresolvedCashUpsForUser: async () => 1 },
    });
    await expect(
      unresolved.service.deactivateMember(actor(), managerMembershipId),
    ).rejects.toMatchObject({ code: 'MEMBER_HAS_UNRESOLVED_CASHUPS' });

    const self = service({
      businesses: { lockBusiness: async () => business },
      memberships: { getMember: async () => member() },
    });
    await expect(
      self.service.deactivateMember(actor(), ownerMembershipId),
    ).rejects.toMatchObject({ code: 'MEMBER_CANNOT_DEACTIVATE_SELF' });

    const manager = service({
      businesses: { lockBusiness: async () => business },
    memberships: {
      getMember: async () => ({ ...target, role: MembershipRole.MANAGER }),
    },
    });
    await expect(
    manager.service.deactivateMember(actor('MANAGER'), managerMembershipId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('replaces the manager, rejects unresolved work, and refuses manager changes in solo mode', async () => {
    const target = member({
      id: managerMembershipId,
      userId: 'target-user',
      role: MembershipRole.STAFF,
    });
    const setup = service({
      businesses: { lockBusiness: async () => business },
      memberships: {
        getMember: async () => ({ ...target, role: MembershipRole.MANAGER }),
        replaceManager: async () => ({
          status: 'replaced',
          oldManager: null,
          newManager: { ...target, role: MembershipRole.MANAGER },
          oldManagerUnresolvedCashUpCount: 0,
        }),
      },
    });
    await expect(
      setup.service.replaceManager(actor(), managerMembershipId),
    ).resolves.toMatchObject({ role: MembershipRole.MANAGER });

    const unresolved = service({
      businesses: { lockBusiness: async () => business },
      memberships: {
        getMember: async () => target,
        replaceManager: async () => ({
          status: 'old_manager_has_unresolved_cashups',
          oldManagerUnresolvedCashUpCount: 1,
        }),
      },
    });
    await expect(
      unresolved.service.replaceManager(actor(), managerMembershipId),
    ).rejects.toMatchObject({ code: 'MEMBER_HAS_UNRESOLVED_CASHUPS' });

    const solo = service({
      businesses: { lockBusiness: async () => ({ ...business, isSolo: true }) },
    });
    await expect(
      solo.service.replaceManager(actor(), managerMembershipId),
    ).rejects.toMatchObject({ code: 'MANAGER_CHANGE_IN_SOLO_BUSINESS' });
  });

  it('requires an empty, unresolved-cash-up-free business before enabling solo mode', async () => {
    const setup = service({
      businesses: {
        getBusiness: async () => business,
        setBusinessSolo: async () => ({
          status: 'updated',
          business: { ...business, isSolo: true },
          otherActiveMemberCount: 1,
          unresolvedCashUpCount: 0,
        }),
      },
    });
    await expect(
      setup.service.setBusinessSolo(actor(), { isSolo: true }),
    ).rejects.toMatchObject({ code: 'SOLO_CHANGE_BLOCKED' });

    const noPending = service({
      businesses: {
        getBusiness: async () => business,
        setBusinessSolo: async () => ({
          status: 'updated',
          business: { ...business, isSolo: true },
          otherActiveMemberCount: 0,
          unresolvedCashUpCount: 0,
        }),
      },
    });
    await expect(
      noPending.service.setBusinessSolo(actor(), { isSolo: true }),
    ).resolves.toMatchObject({ isSolo: true });

    await expect(
      noPending.service.setBusinessSolo(actor('MANAGER'), { isSolo: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const leaveSoloWithOtherMember = service({
      businesses: {
        getBusiness: async () => ({ ...business, isSolo: true }),
        setBusinessSolo: async () => ({
          status: 'updated',
          business,
          otherActiveMemberCount: 1,
          unresolvedCashUpCount: 0,
        }),
      },
    });
    await expect(
      leaveSoloWithOtherMember.service.setBusinessSolo(actor(), { isSolo: false }),
    ).rejects.toMatchObject({ code: 'SOLO_CHANGE_BLOCKED' });
  });

  it('creates and lists hashed join codes with derived statuses only', async () => {
    const createdJoinCode = joinCode();
    let recordedHash = '';
    const setup = service({
      businesses: { getBusiness: async () => business },
      joinCodes: {
        createJoinCode: async (input) => {
          recordedHash = input.codeHash;
          return { ...createdJoinCode, ...input };
        },
        listJoinCodes: async () => [
          createdJoinCode,
          joinCode({ id: 'expired', expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
          joinCode({ id: 'used', usedCount: 1 }),
          joinCode({ id: 'revoked', revokedAt: now }),
        ],
      },
    });
    const created = await setup.service.createJoinCode(actor(), {
      expiresInDays: 7,
      maxUses: 1,
    });
    expect(created.code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
    expect(recordedHash).toBe(createHash('sha256').update(created.code).digest('hex'));
    expect(recordedHash).not.toContain(created.code);

    const listed = await setup.service.listJoinCodes(actor());
    expect(listed.map((entry) => entry.status)).toEqual([
      'active',
      'expired',
      'used_up',
      'revoked',
    ]);
    expect(JSON.stringify(listed)).not.toMatch(/codeHash|23456789ABCD/);
  });

  it('revokes a tenant-visible join code', async () => {
    const setup = service({
      businesses: { getBusiness: async () => business },
      joinCodes: {
        revokeJoinCode: async () => ({ status: 'revoked', joinCode: joinCode() }),
      },
    });
    await expect(
      setup.service.revokeJoinCode(actor(), managerMembershipId),
    ).resolves.toEqual({ id: managerMembershipId, status: 'revoked' });
  });

  it('maps all invalid join-code states to one error and accepts a successful redemption', async () => {
    const invalidStates = [
      'not_found',
      'revoked',
      'expired',
      'max_uses_reached',
      'usage_update_failed',
    ] as const;
    for (const status of invalidStates) {
      const setup = service({}, {
        redeemJoinCodeByHash: async () => ({ status }),
      });
      await expect(
        setup.service.redeemJoinCode(userId, '23456789ABCD'),
      ).rejects.toBeInstanceOf(BusinessRuleError);
      await expect(
        setup.service.redeemJoinCode(userId, '23456789ABCD'),
      ).rejects.toMatchObject({ code: 'JOIN_CODE_INVALID' });
    }

    const redeemed = service({}, {
      redeemJoinCodeByHash: async () => ({
        status: 'redeemed',
        joinCodeId: managerMembershipId,
        member: member(),
      }),
    });
    await expect(
      redeemed.service.redeemJoinCode(userId, '23456789ABCD'),
    ).resolves.toEqual({ role: 'STAFF', status: 'ACTIVE' });

    const alreadyBelongs = service({}, {
      redeemJoinCodeByHash: async () => ({
        status: 'user_already_belongs_to_a_business',
      }),
    });
    await expect(
      alreadyBelongs.service.redeemJoinCode(userId, '23456789ABCD'),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
