import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';

jest.setTimeout(25000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', deliveryFeeUsd: '2', clientNumber: '+961123456', note: 'Original' };
const payment = { method: 'CASH' as const, totalCollectedUsd: '20', totalCollectedLbp: '0', changeGivenUsd: '6', changeGivenLbp: '0', tipUsd: '2', tipLbp: '0' };
async function setup() {
  const { businessA } = await seedBusinesses();
  const actor = await staffActor(businessA);
  const cashUp = await services.lifecycle.open(actor, { referenceRate: '89500' });
  const sale = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  return { actor, cashUp, sale };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
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
  throw new Error('Expected the competing service to wait for the cash-up FOR UPDATE lock');
}
it('keeps pending edits nullable and rejects a delivered edit with the exact code and no database side effects', async () => {
  const { actor, cashUp, sale } = await setup();
  const edited = await services.sales.edit(actor, cashUp.id, sale.saleId, { note: 'Pending edit', businessAmountUsd: '12' });
  expect(edited.sale).toMatchObject({ method: null, totalCollectedUsd: null, totalCollectedLbp: null, tipUsd: null, tipLbp: null, changeGivenUsd: null, changeGivenLbp: null });
  await services.sales.confirmDelivery(actor, cashUp.id, sale.saleId, { ...payment, changeGivenUsd: '4' });
  const before = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  const edits = await prisma.saleEdit.count({ where: { saleId: sale.saleId } });
  const audits = await prisma.auditLog.count({ where: { entityId: sale.saleId } });
  await expect(services.sales.edit(actor, cashUp.id, sale.saleId, { note: 'Rejected' })).rejects.toMatchObject({ name: 'BusinessRuleError', code: 'SALE_ALREADY_DELIVERED' });
  expect(await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } })).toEqual(before);
  expect(await prisma.saleEdit.count({ where: { saleId: sale.saleId } })).toBe(edits);
  expect(await prisma.auditLog.count({ where: { entityId: sale.saleId } })).toBe(audits);
  await expect(prisma.$transaction(tx => new SaleRepository(actor.businessId, tx).edit(sale.saleId, { note: 'Repository bypass' }, actor.membershipId))).rejects.toMatchObject({ code: 'STALE_STATE' });
  expect(await prisma.saleEdit.count({ where: { saleId: sale.saleId } })).toBe(edits);
});
it.each(['delivery', 'edit'] as const)('serializes both services on the same cash-up lock with %s first', async firstOperation => {
  const { actor, cashUp, sale } = await setup();
  const acquired = deferred(), release = deferred();
  const original = CashUpRepository.prototype.lockForUpdate;
  let holdFirst = true;
  const lock = jest.spyOn(CashUpRepository.prototype, 'lockForUpdate').mockImplementation(async function(this: CashUpRepository, id: string) {
    const result = await original.call(this, id);
    if (id === cashUp.id && holdFirst) {
      holdFirst = false;
      acquired.resolve();
      await release.promise;
    }
    return result;
  });
  const edit = () => services.sales.edit(actor, cashUp.id, sale.saleId, { note: 'Edited before delivery', deliveryFeeUsd: '3' });
  const deliver = () => services.sales.confirmDelivery(actor, cashUp.id, sale.saleId, { ...payment, changeGivenUsd: firstOperation === 'delivery' ? '6' : '5' });
  const first = firstOperation === 'delivery' ? deliver() : edit();
  const firstOutcome = first.then(value => ({ value, error: null }), error => ({ value: null, error }));
  let secondOutcome: typeof firstOutcome | undefined;
  try {
    await Promise.race([acquired.promise, first.then(() => { throw new Error('Service completed before reaching the test barrier'); })]);
    const second = firstOperation === 'delivery' ? edit() : deliver();
    secondOutcome = second.then(value => ({ value, error: null }), error => ({ value: null, error }));
    await waitForCashUpLockWait();
  } finally {
    release.resolve();
    await firstOutcome;
    if (secondOutcome) await secondOutcome;
    lock.mockRestore();
  }
  const firstResult = await firstOutcome;
  expect(firstResult.error).toBeNull();
  const secondResult = await secondOutcome!;
  if (firstOperation === 'delivery') expect(secondResult.error).toMatchObject({ name: 'BusinessRuleError', code: 'SALE_ALREADY_DELIVERED' });
  else expect(secondResult.error).toBeNull();
  const row = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  expect(row).toMatchObject({ status: 'DELIVERED', method: 'CASH', deliveredAt: expect.any(Date), amountDiffers: false, note: firstOperation === 'delivery' ? 'Original' : 'Edited before delivery' });
  expect(row.deliveryFeeUsd.toString()).toBe(firstOperation === 'delivery' ? '2' : '3');
  expect(row.tipUsd!.toString()).toBe('2');
  expect(row.totalCollectedUsd!.toString()).toBe('20');
  expect(await prisma.saleEdit.count({ where: { saleId: sale.saleId } })).toBe(firstOperation === 'delivery' ? 0 : 2);
  expect(await prisma.auditLog.count({ where: { entityId: sale.saleId, action: 'SALE_EDITED' } })).toBe(firstOperation === 'delivery' ? 0 : 1);
  expect(await prisma.auditLog.count({ where: { entityId: sale.saleId, action: 'SALE_DELIVERED' } })).toBe(1);
  await expect(services.sales.edit(actor, cashUp.id, sale.saleId, { deliveryFeeUsd: '100' })).rejects.toMatchObject({ code: 'SALE_ALREADY_DELIVERED' });
  expect(await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } })).toEqual(row);
});
