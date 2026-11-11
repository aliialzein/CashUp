import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';

jest.setTimeout(25000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
const reason = 'Shift cancelled';
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', clientNumber: '+961123456' };
const delivered = { status: 'DELIVERED' as const, businessAmountUsd: '10', method: 'CASH' as const, totalCollectedUsd: '10', totalCollectedLbp: '0', changeGivenUsd: '0', changeGivenLbp: '0', tipUsd: '0', tipLbp: '0' };
const expense = { amountUsd: '2', amountLbp: '0', reason: 'Supplies' };
async function setup() {
  const fixtures = await seedBusinesses();
  const actor = await staffActor(fixtures.businessA);
  const cashUp = await services.lifecycle.open(actor, {});
  return { fixtures, actor, cashUp };
}
async function snapshot(cashUpId: string, businessId: string) {
  const [cashUp, sales, cashOuts, counts, edits, audits] = await Promise.all([
    prisma.cashUp.findUniqueOrThrow({ where: { id: cashUpId } }),
    prisma.sale.findMany({ where: { cashUpId }, orderBy: { id: 'asc' } }),
    prisma.cashOut.findMany({ where: { cashUpId }, orderBy: { id: 'asc' } }),
    prisma.countEntry.findMany({ where: { cashUpId }, orderBy: { id: 'asc' } }),
    prisma.saleEdit.findMany({ where: { sale: { cashUpId } }, orderBy: { id: 'asc' } }),
    prisma.auditLog.findMany({ where: { businessId }, orderBy: { id: 'asc' } }),
  ]);
  return { cashUp, sales, cashOuts, counts, edits, audits };
}
it('voids an empty own OPEN cash-up and retains count entries, with one trimmed-reason audit', async () => {
  const { actor, cashUp } = await setup();
  await services.counts.replace(actor, cashUp.id, { lines: [{ currency: 'USD', denomination: '5', quantity: 2 }] });
  const counts = await prisma.countEntry.findMany({ where: { cashUpId: cashUp.id } });
  expect(counts.length).toBeGreaterThan(0);
  expect(await services.lifecycle.voidOwnOpen(actor, cashUp.id, '  Shift cancelled  ')).toMatchObject({ status: 'VOID', voidReason: reason });
  expect(await prisma.countEntry.findMany({ where: { cashUpId: cashUp.id } })).toEqual(counts);
  expect(await prisma.auditLog.count({ where: { entityId: cashUp.id, action: 'CASHUP_VOIDED' } })).toBe(1);
});
it.each(['TO_DELIVER', 'DELIVERED', 'DELETED'] as const)('a %s sale blocks voiding without changing any records or audit history', async status => {
  const { actor, cashUp } = await setup();
  const sale = await services.sales.create(actor, cashUp.id, status === 'DELIVERED' ? delivered : pending, randomUUID());
  if (status === 'DELETED') await services.sales.cancel(actor, cashUp.id, sale.saleId, 'Customer cancelled');
  const before = await snapshot(cashUp.id, actor.businessId);
  await expect(services.lifecycle.voidOwnOpen(actor, cashUp.id, reason)).rejects.toMatchObject({ code: 'CASHUP_NOT_EMPTY' });
  expect(await snapshot(cashUp.id, actor.businessId)).toEqual(before);
  expect(await prisma.auditLog.count({ where: { entityId: cashUp.id, action: 'CASHUP_VOIDED' } })).toBe(0);
});
it.each(['ACTIVE', 'CANCELLED'] as const)('a %s cash-out blocks voiding without changing any records or audit history', async status => {
  const { actor, cashUp } = await setup();
  const created = await services.cashOuts.create(actor, cashUp.id, expense, randomUUID());
  if (status === 'CANCELLED') await services.cashOuts.cancel(actor, cashUp.id, created.cashOut.id, 'Expense cancelled');
  const before = await snapshot(cashUp.id, actor.businessId);
  await expect(services.lifecycle.voidOwnOpen(actor, cashUp.id, reason)).rejects.toMatchObject({ code: 'CASHUP_NOT_EMPTY' });
  expect(await snapshot(cashUp.id, actor.businessId)).toEqual(before);
});
it('ignores records in other businesses and other cash-ups, while rejecting other owners and businesses', async () => {
  const { fixtures, actor, cashUp } = await setup();
  const foreign = await staffActor(fixtures.businessB);
  const foreignCashUp = await services.lifecycle.open(foreign, {});
  await services.sales.create(foreign, foreignCashUp.id, delivered, randomUUID());
  await services.cashOuts.create(foreign, foreignCashUp.id, expense, randomUUID());
  const other = await staffActor(fixtures.businessA, 2);
  const otherCashUp = await services.lifecycle.open(other, {});
  await services.sales.create(other, otherCashUp.id, pending, randomUUID());
  await services.cashOuts.create(other, otherCashUp.id, expense, randomUUID());
  const before = await snapshot(cashUp.id, actor.businessId);
  await expect(services.lifecycle.voidOwnOpen(other, cashUp.id, reason)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  await expect(services.lifecycle.voidOwnOpen(foreign, cashUp.id, reason)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  expect(await snapshot(cashUp.id, actor.businessId)).toEqual(before);
  const foreignBefore = await snapshot(foreignCashUp.id, foreign.businessId);
  expect(await services.lifecycle.voidOwnOpen(actor, cashUp.id, reason)).toMatchObject({ status: 'VOID' });
  expect(await snapshot(foreignCashUp.id, foreign.businessId)).toEqual(foreignBefore);
  expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: otherCashUp.id } })).status).toBe('OPEN');
});
it.each(['SUBMITTED', 'APPROVED', 'VOID'] as const)('keeps %s status errors ahead of the expanded emptiness check', async status => {
  const { actor, cashUp } = await setup();
  await services.cashOuts.create(actor, cashUp.id, expense, randomUUID());
  await prisma.cashUp.update({ where: { id: cashUp.id }, data: { status } });
  const before = await snapshot(cashUp.id, actor.businessId);
  await expect(services.lifecycle.voidOwnOpen(actor, cashUp.id, reason)).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
  await expect(services.lifecycle.voidOwnOpen(actor, cashUp.id, 'x')).rejects.toMatchObject({ code: 'VOID_REASON_INVALID' });
  expect(await snapshot(cashUp.id, actor.businessId)).toEqual(before);
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function settle(work: Promise<unknown>): Promise<{ error: unknown }> {
  try { await work; return { error: null }; }
  catch (error) { return { error }; }
}
async function waitForCashUpLockWait() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw<Array<{ waiting: number }>>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock' AND query LIKE '%FROM "cash_ups"%' AND query LIKE '%FOR UPDATE%'
    `;
    if (rows[0].waiting > 0) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected creation and voiding to contend for the cash-up FOR UPDATE lock');
}
it.each((['sale', 'cash-out'] as const).flatMap(kind => (['create', 'void'] as const).map(firstOperation => ({ kind, firstOperation }))))('serializes $kind creation and voiding with $firstOperation first', async ({ kind, firstOperation }) => {
  const { actor: currentActor, cashUp: current } = await setup();
  const acquired = deferred(), release = deferred();
  const original = CashUpRepository.prototype.lockForUpdate;
  let holdFirst = true;
  const lock = jest.spyOn(CashUpRepository.prototype, 'lockForUpdate').mockImplementation(async function(this: CashUpRepository, id: string) {
    const result = await original.call(this, id);
    if (id === current.id && holdFirst) { holdFirst = false; acquired.resolve(); await release.promise; }
    return result;
  });
  const create = () => kind === 'sale' ? services.sales.create(currentActor, current.id, pending, randomUUID()) : services.cashOuts.create(currentActor, current.id, expense, randomUUID());
  const cancel = () => services.lifecycle.voidOwnOpen(currentActor, current.id, reason);
  const first = firstOperation === 'create' ? create() : cancel();
  const firstOutcome = settle(first);
  let secondOutcome: Promise<{ error: unknown }> | undefined;
  try {
    await Promise.race([acquired.promise, first.then(() => { throw new Error('Service completed before reaching the test barrier'); })]);
    secondOutcome = settle(firstOperation === 'create' ? cancel() : create());
    await waitForCashUpLockWait();
  } finally {
    release.resolve();
    await firstOutcome;
    if (secondOutcome) await secondOutcome;
    lock.mockRestore();
  }
  expect((await firstOutcome).error).toBeNull();
  expect((await secondOutcome!).error).toMatchObject({ code: firstOperation === 'create' ? 'CASHUP_NOT_EMPTY' : 'CASHUP_NOT_OPEN' });
  const row = await prisma.cashUp.findUniqueOrThrow({ where: { id: current.id } });
  expect(row.status).toBe(firstOperation === 'create' ? 'OPEN' : 'VOID');
  const sales = await prisma.sale.count({ where: { cashUpId: current.id } });
  const cashOuts = await prisma.cashOut.count({ where: { cashUpId: current.id } });
  expect(sales).toBe(firstOperation === 'create' && kind === 'sale' ? 1 : 0);
  expect(cashOuts).toBe(firstOperation === 'create' && kind === 'cash-out' ? 1 : 0);
  expect(await prisma.auditLog.count({ where: { entityId: current.id, action: 'CASHUP_VOIDED' } })).toBe(firstOperation === 'void' ? 1 : 0);
});
