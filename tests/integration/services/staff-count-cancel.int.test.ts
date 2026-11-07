import { randomUUID } from 'node:crypto';
import { AuditAction, NotInTransactionError } from '../../../src/persistence';
import { buildSubmitSnapshot } from '../../../src/domain/money';
import { saveCountLinesSchema } from '../../../src/validation';
import { AuditTrail, type AuditRecord } from '../../../src/services/audit-trail';
import { createServices } from '../../../src/services/container';
import type { Actor } from '../../../src/services';
import type { TransactionRepositories } from '../../../src/services/ports';
import {
  managerActor, prisma, resetDatabase, seedBusinesses, services, staffActor, uow,
} from './service-test-support';

async function setup() {
  const { businessA: business, businessB } = await seedBusinesses();
  const actor = await staffActor(business);
  const cashUp = await services.lifecycle.open(actor, { floatUsd: '20.00' });
  const { cashOut } = await services.cashOuts.create(actor, cashUp.id, {
    amount: '7.00', currency: 'USD', reason: 'Supplies',
  }, randomUUID());
  return { business, businessB, actor, cashUp, cashOut };
}

// Fail a real audit INSERT after a valid one, proving both audit and mutation roll back.
class FailingAuditTrail extends AuditTrail {
  override async record(repos: TransactionRepositories, actor: Actor, entry: AuditRecord) {
    await super.record(repos, actor, entry);
    await super.record(repos, { ...actor, userId: randomUUID() }, entry);
  }
}

describe('Staff count replacement and cash-out cancellation', () => {
  beforeEach(resetDatabase);
  afterAll(async () => { await prisma.$disconnect(); });

  it('replaces counts, zeroes omitted lines, and excludes cancelled cash-outs from snapshots and review totals', async () => {
    const { business, actor, cashUp, cashOut } = await setup();
    await services.cashOuts.create(actor, cashUp.id, {
      amount: '3.00', currency: 'USD', reason: 'Active expense',
    }, randomUUID());
    await services.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({ lines: [
      { currency: 'USD', denomination: '10', quantity: 2 },
      { currency: 'USD', denomination: '5', quantity: 1 },
      { currency: 'LBP', denomination: '1000', quantity: 1 },
    ] }));
    const replaced = await services.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({ lines: [
      { currency: 'USD', denomination: '10', quantity: 1 },
      { currency: 'USD', denomination: '1', quantity: 7 },
    ] }));
    expect(replaced.countedTotals).toEqual({ USD: '17.00', LBP: '0.00' });
    expect(replaced.lines).toEqual(expect.arrayContaining([
      { currency: 'USD', denomination: '5.00', quantity: 0 },
      { currency: 'LBP', denomination: '1000.00', quantity: 0 },
      { currency: 'USD', denomination: '10.00', quantity: 1 },
    ]));
    const cancelled = await services.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Not needed');
    expect(cancelled.cashOut).toMatchObject({ status: 'CANCELLED', cancelReason: 'Not needed' });
    expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toMatchObject({
      cancelledByMembershipId: actor.membershipId, cancelledAt: expect.any(Date),
    });
    const expected = buildSubmitSnapshot({
      floatUsd: '20.00', floatLbp: '0.00', sales: [], change: [],
      cashOuts: [
        { currency: 'USD', total: '7.00', status: 'CANCELLED' },
        { currency: 'USD', total: '3.00', status: 'ACTIVE' },
      ], counted: { USD: '17.00', LBP: '0.00' },
    });
    expect(expected).toEqual({ expectedUsd: '17.00', expectedLbp: '0.00',
      countedUsd: '17.00', countedLbp: '0.00', gapUsd: '0.00', gapLbp: '0.00' });
    expect(await services.lifecycle.submit(actor, cashUp.id)).toMatchObject({ status: 'SUBMITTED', ...expected });
    const review = await services.queries.getReviewDetail(await managerActor(business), cashUp.id);
    expect(review.expectedAndGap.USD).toMatchObject({ expected: '17.00', counted: '17.00', gap: '0.00' });
    const audit = await uow.repos({ businessId: business.id }).audit.list({ entityId: cashOut.id });
    expect(audit.filter(row => row.action === AuditAction.CASHOUT_CANCELLED)).toEqual([
      expect.objectContaining({ actorId: actor.userId, metadata: { reason: 'Not needed' } }),
    ]);
    const countAudit = await uow.repos({ businessId: business.id }).audit.list({ entityId: cashUp.id });
    expect(countAudit.filter(row => row.action === AuditAction.COUNT_UPDATED)).toHaveLength(2);
  });

  it('allows only one concurrent cancellation and preserves the winning reason and audit', async () => {
    const { business, actor, cashUp, cashOut } = await setup();
    const results = await Promise.allSettled(['First', 'Second'].map(reason =>
      services.cashOuts.cancel(actor, cashUp.id, cashOut.id, reason)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'CONFLICT' }) }),
    ]);
    const row = await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } });
    const audits = await uow.repos({ businessId: business.id }).audit.list({ entityId: cashOut.id });
    expect(audits.filter(entry => entry.action === AuditAction.CASHOUT_CANCELLED)).toEqual([
      expect.objectContaining({ metadata: { reason: row.cancelReason } }),
    ]);
    await expect(services.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Again')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toEqual(row);
  });

  it('requires a transaction and preserves missing-record, ownership, and tenant hiding', async () => {
    const { business, businessB, actor, cashUp, cashOut } = await setup();
    await expect(uow.repos({ businessId: business.id }).cashOuts.cancel(cashOut.id, 'Outside', actor.membershipId))
      .rejects.toBeInstanceOf(NotInTransactionError);
    for (const other of [await staffActor(business, 2), await staffActor(businessB)]) {
      await expect(services.cashOuts.cancel(other, cashUp.id, cashOut.id, 'Hidden'))
        .rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    }
    await expect(services.cashOuts.cancel(actor, cashUp.id, randomUUID(), 'Missing'))
      .rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  });

  it('rolls back cancellation, count replacement, and audit inserts when audit persistence fails', async () => {
    const { actor, cashUp, cashOut } = await setup();
    const failing = createServices(uow, { audit: new FailingAuditTrail() });
    const before = await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } });
    const auditBefore = await prisma.auditLog.count();
    await expect(failing.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Rollback')).rejects.toThrow();
    expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toEqual(before);
    await expect(failing.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({ lines: [
      { currency: 'USD', denomination: '10', quantity: 1 },
    ] }))).rejects.toThrow();
    expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(0);
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).countStartedAt).toBeNull();
    expect(await prisma.auditLog.count()).toBe(auditBefore);
  });
});
