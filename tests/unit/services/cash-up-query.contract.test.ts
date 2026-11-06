import { Prisma } from '../../../src/generated/prisma/client';
import type { CashOut, CashUp, Membership } from '../../../src/generated/prisma/client';
import { ACTOR_BRAND } from '../../../src/services/actor';
import type { Actor } from '../../../src/services/actor';
import { CashUpApprovalPolicy } from '../../../src/services/cash-up-approval-policy';
import { CashUpQueryService } from '../../../src/services/cash-up-query.service';
import { EntityNotFoundError } from '../../../src/services/errors';
import { PermissionMatrix } from '../../../src/services/permissions';
import { markTransactionRepositories } from '../../../src/services/ports';
import { UseCaseRunner } from '../../../src/services/use-case-runner';
import { serviceRepositories } from './service-repositories';

const businessId = 'c0f049c8-a170-4c72-9177-8767b1ea0904';
const staffMembershipId = 'c993b54f-f441-4a56-9d8e-0936ca59ccbc';
const managerMembershipId = 'c5b51876-8e33-4b48-bdeb-ec803f41b202';
const cashUpId = 'b7bc0d14-f58f-4fa2-8432-39d2974d133d';
const now = new Date('2026-11-03T10:00:00.000Z');

const staffActor: Actor = {
  userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
  membershipId: staffMembershipId,
  businessId,
  role: 'STAFF',
  [ACTOR_BRAND]: true,
};

const managerActor: Actor = {
  ...staffActor,
  membershipId: managerMembershipId,
  role: 'MANAGER',
};

function cashUp(
  status: CashUp['status'],
  ownerId = staffMembershipId,
): CashUp {
  return {
    id: cashUpId,
    businessId,
    membershipId: ownerId,
    status,
    floatUsd: new Prisma.Decimal('10.00'),
    floatLbp: new Prisma.Decimal('0.00'),
    referenceRate: null,
    openedAt: now,
    countStartedAt: null,
    closedAt: null,
    approvedAt: null,
    voidedAt: null,
    updatedAt: now,
    approvedById: null,
    selfApproved: false,
    returnReason: null,
    voidReason: null,
    lastSaleNumber: 0,
    expectedUsd: null,
    expectedLbp: null,
    countedUsd: null,
    countedLbp: null,
    gapUsd: null,
    gapLbp: null,
  };
}

function cashOut(status: CashOut['status'], amount: string, id: string): CashOut {
  return {
    id,
    cashUpId,
    amount: new Prisma.Decimal(amount),
    currency: 'USD',
    reason: status === 'ACTIVE' ? 'Till supplies' : 'Returned supplies',
    status,
    cancelReason: status === 'CANCELLED' ? 'No longer needed' : null,
    cancelledAt: status === 'CANCELLED' ? now : null,
    cancelledByMembershipId: status === 'CANCELLED' ? staffMembershipId : null,
    idempotencyKey: null,
    createdAt: now,
    updatedAt: now,
  };
}

function ownerMembership(
  id = staffMembershipId,
  role: Membership['role'] = 'STAFF',
): Membership {
  return {
    id,
    userId: staffActor.userId,
    businessId,
    role,
    status: 'ACTIVE',
    joinedAt: now,
    deactivatedAt: null,
  };
}

function serviceWithCashOutRows(
  status: CashUp['status'],
  options: {
    businessMissing?: boolean;
    ownMissing?: boolean;
    reviewMissing?: boolean;
    ownerMissing?: boolean;
    ownerId?: string;
    ownerRole?: Membership['role'];
    reviewedEmpty?: boolean;
  } = {},
) {
  const row = cashUp(status, options.ownerId);
  const rows = [
    cashOut('ACTIVE', '2.00', 'a3f1212c-b061-4f82-90c5-e057aa8fd564'),
    cashOut('CANCELLED', '5.00', '7f4e3e3a-4771-4196-80f3-0f65b5e3c210'),
  ];
  const membership = {
    ...ownerMembership(options.ownerId, options.ownerRole),
    user: { id: staffActor.userId, fullName: 'Test Staff' },
  };
  const repos = serviceRepositories({
    businesses: {
      findSettings: async () =>
        options.businessMissing
          ? null
          : { id: businessId, name: 'Test shop', isSolo: false },
    },
    cashUps: {
      findById: async () => row,
      findOwn: async () => (options.ownMissing ? null : row),
      findForReview: async () =>
        options.reviewMissing ? null : { ...row, membership },
      listOwn: async () => [row],
      listOpenSummaries: async () => [
        {
          id: cashUpId,
          openedAt: now,
          membership: { id: staffMembershipId, user: { fullName: 'Test Staff' } },
          _count: { sales: 0, requests: 0 },
        },
      ],
      listSubmitted: async () => [
        { ...row, status: 'SUBMITTED' as const, membership },
      ],
      listReviewed: async () =>
        options.reviewedEmpty ? [] : [{ ...row, status: 'APPROVED' as const }],
    },
    memberships: {
      findById: async () =>
        options.ownerMissing
          ? null
          : ownerMembership(options.ownerId, options.ownerRole),
    },
    sales: {
      list: async () => [],
      countByStatus: async () => ({ total: 0, delivered: 0, toDeliver: 0, deleted: 0 }),
      flagCounts: async () => ({
        total: 0,
        deleted: 0,
        edited: 0,
        amountDiffers: 0,
        mixedChange: 0,
        deletionAwaiting: 0,
      }),
      totalsByCurrencyAndMethod: async () => [],
      changeGivenByCurrency: async () => [],
    },
    cashOuts: {
      listByCashUp: async () => rows,
    },
    counts: {
      listByCashUp: async () => [],
      countedTotals: async () => ({
        USD: new Prisma.Decimal('8.00'),
        LBP: new Prisma.Decimal('0.00'),
      }),
    },
  });
  const runner = new UseCaseRunner({
    run: async (_scope, fn) => fn(markTransactionRepositories(repos)),
  });
  return {
    rows,
    service: new CashUpQueryService(
      runner,
      new PermissionMatrix(),
      new CashUpApprovalPolicy(),
    ),
  };
}

describe('cash-up query contracts for cancelled cash-outs', () => {
  it('returns cancelled cash-outs in the staff getOwn detail', async () => {
    const app = serviceWithCashOutRows('OPEN');

    const result = await app.service.getOwn(staffActor, cashUpId);

    expect(result.cashOuts.map(({ status }) => status)).toEqual(['ACTIVE', 'CANCELLED']);
    expect(result.cashOuts[1]).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'No longer needed',
    });
  });

  it('returns cancelled cash-outs in reviewer detail but excludes them from expected cash in domain totals', async () => {
    const app = serviceWithCashOutRows('SUBMITTED');

    const result = await app.service.getReviewDetail(managerActor, cashUpId);

    expect(result.cashOuts.map(({ status }) => status)).toEqual(['ACTIVE', 'CANCELLED']);
    expect(result.cashOuts[1]).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'No longer needed',
    });
    expect(result.expectedAndGap.USD.expected).toBe('8.00');
    expect(result.expectedAndGap.USD.gap).toBe('0.00');
  });

  it('returns filtered own, open-summary, submitted, and reviewed query DTOs', async () => {
    const app = serviceWithCashOutRows('SUBMITTED');

    await expect(app.service.listOwn(staffActor, { take: 10 })).resolves.toHaveLength(1);
    await expect(app.service.listOpenSummaries(managerActor)).resolves.toEqual([
      {
        id: cashUpId,
        openedAt: now.toISOString(),
        staffName: 'Test Staff',
        salesCount: 0,
        requestsCount: 0,
      },
    ]);
    await expect(app.service.listSubmitted(managerActor)).resolves.toHaveLength(1);
    await expect(
      app.service.listReviewed(managerActor, { take: 10 }),
    ).resolves.toHaveLength(1);
  });

  it('rejects a reviewed-history cursor that does not point to a reviewed cash-up', async () => {
    const app = serviceWithCashOutRows('OPEN');

    await expect(
      app.service.listReviewed(managerActor, { take: 10, cursorId: cashUpId }),
    ).resolves.toEqual([]);
  });

  it('returns 404 for missing business, own cash-up, or reviewer detail', async () => {
    const missingBusiness = serviceWithCashOutRows('OPEN', { businessMissing: true });
    await expect(
      missingBusiness.service.getOwn(staffActor, cashUpId),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const missingOwn = serviceWithCashOutRows('OPEN', { ownMissing: true });
    await expect(
      missingOwn.service.getOwn(staffActor, cashUpId),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const missingReview = serviceWithCashOutRows('SUBMITTED', { reviewMissing: true });
    await expect(
      missingReview.service.getReviewDetail(managerActor, cashUpId),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('filters submitted rows when the owner is missing or not reviewable, but includes a Manager own row', async () => {
    const missingOwner = serviceWithCashOutRows('SUBMITTED', { ownerMissing: true });
    await expect(
      missingOwner.service.listSubmitted(managerActor),
    ).resolves.toEqual([]);

    const wrongReviewer = serviceWithCashOutRows('SUBMITTED', {
      ownerId: staffMembershipId,
      ownerRole: 'MANAGER',
    });
    await expect(
      wrongReviewer.service.listSubmitted(managerActor),
    ).resolves.toEqual([]);

    const managerOwn = serviceWithCashOutRows('SUBMITTED', {
      ownerId: managerMembershipId,
      ownerRole: 'MANAGER',
    });
    await expect(
      managerOwn.service.listSubmitted(managerActor),
    ).resolves.toHaveLength(1);
  });

  it('accepts a visible reviewed cursor in range and stops when the page is empty', async () => {
    const visibleAnchor = serviceWithCashOutRows('APPROVED');
    await expect(
      visibleAnchor.service.listReviewed(managerActor, {
        take: 10,
        cursorId: cashUpId,
        membershipId: staffMembershipId,
        from: '2026-11-03',
        to: '2026-11-03',
      }),
    ).resolves.toHaveLength(1);

    const emptyPage = serviceWithCashOutRows('APPROVED', { reviewedEmpty: true });
    await expect(
      emptyPage.service.listReviewed(managerActor, {
        take: 10,
        cursorId: cashUpId,
      }),
    ).resolves.toEqual([]);
  });

  it('hides reviewed cursors outside requested membership/date filters or without reviewer visibility', async () => {
    const app = serviceWithCashOutRows('APPROVED');
    await expect(
      app.service.listReviewed(managerActor, {
        take: 10,
        cursorId: cashUpId,
        membershipId: managerMembershipId,
      }),
    ).resolves.toEqual([]);
    await expect(
      app.service.listReviewed(managerActor, {
        take: 10,
        cursorId: cashUpId,
        from: '2026-11-04',
      }),
    ).resolves.toEqual([]);

    const invisibleAnchor = serviceWithCashOutRows('APPROVED', {
      ownerId: staffMembershipId,
      ownerRole: 'MANAGER',
    });
    await expect(
      invisibleAnchor.service.listReviewed(managerActor, {
        take: 10,
        cursorId: cashUpId,
      }),
    ).resolves.toEqual([]);
  });

  it('hides reviewer detail for the reviewer own cash-up and for a wrong reviewer role', async () => {
    const ownCashUp = serviceWithCashOutRows('SUBMITTED', {
      ownerId: managerMembershipId,
      ownerRole: 'MANAGER',
    });
    await expect(
      ownCashUp.service.getReviewDetail(managerActor, cashUpId),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const wrongRole = serviceWithCashOutRows('SUBMITTED', {
      ownerId: staffMembershipId,
      ownerRole: 'MANAGER',
    });
    await expect(
      wrongRole.service.getReviewDetail(managerActor, cashUpId),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
