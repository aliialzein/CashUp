import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { Prisma } from '../../../src/generated/prisma/client';
import {
  AuditAction,
  Currency,
  PaymentMethod,
  SaleStatus,
  StaleStateError,
} from '../../../src/persistence';
import { AuditTrail } from '../../../src/services/audit-trail';
import { createServices } from '../../../src/services/container';
import { ForbiddenError } from '../../../src/services/errors';
import type { Repositories } from '../../../src/persistence';
import { makeSaleInput } from '../persistence/test-support';
import {
  managerActor,
  openEmptyCashUp,
  ownerActor,
  prisma,
  resetDatabase,
  seedBusinesses,
  services,
  staffActor,
  uow,
} from './service-test-support';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function deferred(): Deferred {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((finish) => {
    resolvePromise = finish;
  });
  return {
    promise,
    resolve: () => {
      if (!resolvePromise) throw new Error('Deferred promise is not initialized.');
      resolvePromise();
    },
  };
}

async function waitForCashUpLockWaits(expected: number): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS waiting
      FROM pg_stat_activity
      WHERE wait_event_type = 'Lock'
        AND query ILIKE ${'%FROM "cash_ups"%'}
        AND query ILIKE ${'%FOR UPDATE%'}
    `);
    if (waiting >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${expected} cash-up lock waiter(s).`);
}

async function holdCashUpLock(businessId: string, cashUpId: string) {
  const acquired = deferred();
  const release = deferred();
  const holder = uow.run({ businessId }, async (repos) => {
    await repos.cashUps.lockForUpdate(cashUpId);
    acquired.resolve();
    await release.promise;
  });
  await acquired.promise;
  return { holder, release };
}

describe('cash-up lifecycle services', () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('enforces opening permissions, records audit, and rolls back when audit fails', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const opened = await services.lifecycle.open(staff, { floatUsd: '10.00' });
    expect(opened.status).toBe('OPEN');
    await expect(services.lifecycle.open(staff, {})).rejects.toMatchObject({
      code: 'CASHUP_ALREADY_OPEN',
    });
    await expect(services.lifecycle.open(await ownerActor(business), {})).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    const auditRows = await uow.repos({ businessId: business.id }).audit.list({
      entityId: opened.id,
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ actorId: staff.userId, action: AuditAction.CASHUP_OPENED });

    class FailingAuditTrail extends AuditTrail {
      override async record(): Promise<void> {
        throw new Error('injected audit failure');
      }
    }
    const failingServices = createServices(uow, { audit: new FailingAuditTrail() });
    const secondStaff = await staffActor(business, 2);
    await expect(failingServices.lifecycle.open(secondStaff, {})).rejects.toThrow(
      'injected audit failure',
    );
    expect(
      await uow.repos({ businessId: business.id }).cashUps.findOpenByMembership(
        secondStaff.membershipId,
      ),
    ).toBeNull();

    const soloOwner = await ownerActor(fixtures.soloBusiness);
    await expect(services.lifecycle.open(soloOwner, {})).resolves.toMatchObject({
      status: 'OPEN',
    });
  });

  it('blocks submission for undelivered sales, awaiting requests, and pending deletion', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const firstActor = await staffActor(business);
    const deliveryCashUp = await openEmptyCashUp(business, firstActor);
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(deliveryCashUp.id, { status: SaleStatus.TO_DELIVER }),
      ),
    );
    await expect(
      services.lifecycle.submit(firstActor, deliveryCashUp.id),
    ).rejects.toMatchObject({ code: 'SALES_AWAITING_DELIVERY' });

    const secondActor = await staffActor(business, 2);
    const requestCashUp = await openEmptyCashUp(business, secondActor);
    await prisma.request.create({
      data: {
        businessId: business.id,
        type: 'VOID_CASHUP',
        reason: 'Awaiting decision',
        requestedById: secondActor.membershipId,
        cashUpId: requestCashUp.id,
      },
    });
    await expect(
      services.lifecycle.submit(secondActor, requestCashUp.id),
    ).rejects.toMatchObject({ code: 'REQUESTS_AWAITING_DECISION' });

    const manager = await managerActor(business);
    const deletionCashUp = await openEmptyCashUp(business, manager);
    const { sale } = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(deletionCashUp.id)),
    );
    await prisma.sale.update({ where: { id: sale.id }, data: { deletionAwaiting: true } });
    await expect(
      services.lifecycle.submit(manager, deletionCashUp.id),
    ).rejects.toMatchObject({ code: 'REQUESTS_AWAITING_DECISION' });
  });

  it('submits a server-computed mixed-currency snapshot and audits its gaps', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const cashUp = await services.lifecycle.open(staff, {
      floatUsd: '10.00',
      floatLbp: '1000.00',
    });
    await uow.run({ businessId: business.id }, async (repos) => {
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '30.00',
          totalCollected: '32.00',
          changeGiven: '2.00',
          changeCurrency: Currency.USD,
        }),
      );
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '100.00',
          totalCollected: '100.00',
          method: PaymentMethod.WHISH,
        }),
      );
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '10000.00',
          totalCollected: '10000.00',
          currency: Currency.LBP,
          changeGiven: '1000.00',
          changeCurrency: Currency.LBP,
        }),
      );
      await repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: '5.00',
        currency: Currency.USD,
        reason: 'USD expense',
      });
      await repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: '1000.00',
        currency: Currency.LBP,
        reason: 'LBP expense',
      });
      await repos.counts.saveLines(cashUp.id, [
        { currency: Currency.USD, denomination: '20.00', quantity: 1 },
        { currency: Currency.USD, denomination: '10.00', quantity: 1 },
        { currency: Currency.USD, denomination: '5.00', quantity: 1 },
        { currency: Currency.LBP, denomination: '5000.00', quantity: 1 },
        { currency: Currency.LBP, denomination: '2000.00', quantity: 2 },
      ]);
    });

    const submitted = await services.lifecycle.submit(staff, cashUp.id);
    expect(submitted).toMatchObject({
      status: 'SUBMITTED',
      expectedUsd: '35.00',
      expectedLbp: '9000.00',
      countedUsd: '35.00',
      countedLbp: '9000.00',
      gapUsd: '0.00',
      gapLbp: '0.00',
    });
    const auditRows = await uow.repos({ businessId: business.id }).audit.list({
      entityId: cashUp.id,
    });
    expect(auditRows.find(({ action }) => action === AuditAction.CASHUP_SUBMITTED)).toMatchObject({
      action: AuditAction.CASHUP_SUBMITTED,
      metadata: { gapUsd: '0.00', gapLbp: '0.00' },
    });
  });

  it('applies reviewer policy, return behavior, solo self-approval, and tenant hiding', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const manager = await managerActor(business);
    const owner = await ownerActor(business);

    const approveTarget = await openEmptyCashUp(business, staff);
    await services.lifecycle.submit(staff, approveTarget.id);
    await expect(services.lifecycle.approve(staff, approveTarget.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(services.lifecycle.approve(manager, approveTarget.id)).resolves.toMatchObject({
      status: 'APPROVED',
      approvedById: manager.membershipId,
      selfApproved: false,
    });

    const returnTarget = await openEmptyCashUp(business, await staffActor(business, 2));
    const secondStaff = await staffActor(business, 2);
    await services.lifecycle.submit(secondStaff, returnTarget.id);
    await expect(
      services.lifecycle.returnToOpen(manager, returnTarget.id, 'Recount required'),
    ).resolves.toMatchObject({ status: 'OPEN', returnReason: 'Recount required' });

    const managerCashUp = await openEmptyCashUp(business, manager);
    await services.lifecycle.submit(manager, managerCashUp.id);
    await expect(
      services.lifecycle.approve(manager, managerCashUp.id),
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
    await expect(services.lifecycle.approve(owner, managerCashUp.id)).resolves.toMatchObject({
      status: 'APPROVED',
    });

    const soloOwner = await ownerActor(fixtures.soloBusiness);
    const soloCashUp = await openEmptyCashUp(fixtures.soloBusiness, soloOwner);
    await services.lifecycle.submit(soloOwner, soloCashUp.id);
    await expect(services.lifecycle.approve(soloOwner, soloCashUp.id)).resolves.toMatchObject({
      status: 'APPROVED',
      selfApproved: true,
    });

    const foreign = await openEmptyCashUp(fixtures.businessB, await staffActor(fixtures.businessB));
    await expect(
      services.queries.getReviewDetail(owner, foreign.id),
    ).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    await expect(
      services.lifecycle.approve(owner, foreign.id),
    ).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  });

  it('serializes approve versus return and submit versus sale edit for five iterations', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const manager = await managerActor(business);

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const candidate = await openEmptyCashUp(business, staff);
      await services.lifecycle.submit(staff, candidate.id);
      const lock = await holdCashUpLock(business.id, candidate.id);
      const approval = services.lifecycle.approve(manager, candidate.id);
      await waitForCashUpLockWaits(1);
      const returnRequest = services.lifecycle.returnToOpen(
        manager,
        candidate.id,
        `Return race ${iteration}`,
      );
      try {
        await waitForCashUpLockWaits(2);
      } finally {
        lock.release.resolve();
      }
      await expect(approval).resolves.toMatchObject({ status: 'APPROVED' });
      await expect(returnRequest).rejects.toMatchObject({ code: 'CASHUP_STATE_CONFLICT' });
      await lock.holder;
    }

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const candidate = await openEmptyCashUp(business, staff);
      const { sale } = await uow.run({ businessId: business.id }, (repos) =>
        repos.sales.create(makeSaleInput(candidate.id)),
      );
      const lock = await holdCashUpLock(business.id, candidate.id);
      const submission = services.lifecycle.submit(staff, candidate.id);
      await waitForCashUpLockWaits(1);
      const edit = uow.run({ businessId: business.id }, (repos: Repositories) =>
        repos.sales.edit(sale.id, { note: `late edit ${randomUUID()}` }, staff.membershipId),
      );
      try {
        await waitForCashUpLockWaits(2);
      } finally {
        lock.release.resolve();
      }
      await expect(submission).resolves.toMatchObject({ status: 'SUBMITTED' });
      await expect(edit).rejects.toBeInstanceOf(StaleStateError);
      await lock.holder;
    }
  });
});
