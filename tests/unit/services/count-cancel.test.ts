import type { TransactionRunner } from '../../../src/services/ports';
import type { UnitOfWork } from '../../../src/persistence';
import { createServices } from '../../../src/services';
import { Prisma } from '../../../src/generated/prisma/client';
import type { CashOut, CashUp, CountEntry } from '../../../src/generated/prisma/client';
import { ACTOR_BRAND } from '../../../src/services/actor';
import type { Actor } from '../../../src/services/actor';
import { CashOutService } from '../../../src/services/cash-out.service';
import { CountService } from '../../../src/services/count.service';
import { EntityNotFoundError } from '../../../src/services/errors';
import { PermissionMatrix } from '../../../src/services/permissions';
import { UseCaseRunner } from '../../../src/services/use-case-runner';
import { serviceRepositories } from './service-repositories';

const businessId = '33333333-3333-4333-8333-333333333333';
const membershipId = '22222222-2222-4222-8222-222222222222';
const cashUpId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-03T10:00:00.000Z');

const actor: Actor = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  membershipId,
  businessId,
  role: 'STAFF',
  [ACTOR_BRAND]: true,
};

function openCashUp(): CashUp {
  return {
    id: cashUpId,
    businessId,
    membershipId,
    status: 'OPEN',
    floatUsd: new Prisma.Decimal(0),
    floatLbp: new Prisma.Decimal(0),
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

function countEntry(): CountEntry {
  return {
    id: '148fdf9f-64af-4f61-a707-df61e326cf7d',
    cashUpId,
    currency: 'USD',
    denomination: new Prisma.Decimal('5'),
    quantity: 2,
    updatedAt: now,
  };
}

function cashOut(status: CashOut['status']): CashOut {
  return {
    id: 'a3f1212c-b061-4f82-90c5-e057aa8fd564',
    cashUpId,
    amount: new Prisma.Decimal('2.00'),
    currency: 'USD',
    reason: 'Supplies',
    status,
    cancelReason: status === 'CANCELLED' ? 'No longer needed' : null,
    cancelledAt: status === 'CANCELLED' ? now : null,
    cancelledByMembershipId: status === 'CANCELLED' ? membershipId : null,
    idempotencyKey: null,
    createdAt: now,
    updatedAt: now,
  };
}

function setupRepositories() {
  const cashUp = openCashUp();
  const repositories = serviceRepositories({
    businesses: {
      findSettings: async () => ({ id: businessId, name: 'Demo', isSolo: false }),
    },
    cashUps: {
      lockForUpdate: async () => cashUp,
      findOwn: async () => cashUp,
    },
    counts: {
      saveLines: async () => [countEntry()],
      countedTotals: async () => ({
        USD: new Prisma.Decimal('10'),
        LBP: new Prisma.Decimal('0'),
      }),
    },
    cashOuts: {
      findById: async () => cashOut('ACTIVE'),
      cancel: async () => cashOut('CANCELLED'),
    },
  });
  const runner = new UseCaseRunner({
    run: async (_scope, fn) => fn(repositories),
  });
  const permissions = new PermissionMatrix();
  const audit = { record: async () => undefined };
  return { repositories, runner, permissions, audit };
}

describe('CountService', () => {
  it('rejects count updates when business settings are missing', async () => {
    const repositories = serviceRepositories({
      businesses: { findSettings: async () => null },
    });
    const runner = new UseCaseRunner({
      run: async (_scope, fn) => fn(repositories),
    });
    const service = new CountService(
      runner,
      new PermissionMatrix(),
      { record: async () => undefined },
    );

    await expect(
      service.replace(actor, cashUpId, { lines: [] }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('replaces a whole count set and returns counted totals', async () => {
    const app = setupRepositories();
    const service = new CountService(app.runner, app.permissions, app.audit);

    await expect(
      service.replace(actor, cashUpId, {
        lines: [{ currency: 'USD', denomination: '5', quantity: 2 }],
      }),
    ).resolves.toEqual({
      cashUpId,
      lines: [{ currency: 'USD', denomination: '5.00', quantity: 2 }],
      countedTotals: { USD: '10.00', LBP: '0.00' },
    });
  });
});

describe('CashOutService.cancel', () => {
  it('cancels an active cash-out with the supplied reason', async () => {
    const app = setupRepositories();
    const service = new CashOutService(app.runner, app.permissions, app.audit);

    await expect(
      service.cancel(actor, cashUpId, cashOut('ACTIVE').id, 'No longer needed'),
    ).resolves.toMatchObject({
      cashOut: { status: 'CANCELLED', cancelReason: 'No longer needed' },
    });
  });
});


describe('Cancellation service composition', () => {
  it('uses the supplied transaction and propagates audit failure to its caller', async () => {
    const app = setupRepositories();
    let transactionScope: unknown;
    const transactions: TransactionRunner = {
      run: async (scope, fn) => {
        transactionScope = scope;
        return fn(app.repositories);
      },
    };
    const failure = new Error('audit persistence failed');
    const services = createServices(transactions as unknown as UnitOfWork, {
      audit: { record: async () => { throw failure; } },
    });
    await expect(services.cashOuts.cancel(actor, cashUpId, cashOut('ACTIVE').id, 'Reason'))
      .rejects.toBe(failure);
    expect(transactionScope).toEqual({ businessId: actor.businessId });
    // The public factory must also support the normal persisted audit implementation.
    expect(createServices(transactions as unknown as UnitOfWork).cashOuts).toBeInstanceOf(CashOutService);
  });
});
