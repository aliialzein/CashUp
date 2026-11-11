import { randomUUID } from 'node:crypto';
import { prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', deliveryFeeUsd: '2', discountUsd: '1', clientNumber: '+961123456', note: 'Call on arrival' };
const payment = { method: 'CASH' as const, totalCollectedUsd: '11', totalCollectedLbp: '0', changeGivenUsd: '0', changeGivenLbp: '0', tipUsd: '0', tipLbp: '0' };
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
async function setup() {
  const { businessA } = await seedBusinesses();
  const actor = await staffActor(businessA);
  const cashUp = await services.lifecycle.open(actor, { referenceRate: '89500' });
  return { actor, cashUp };
}
it('persists null pending payment, replays nulls, edits order amounts without balancing and excludes the drawer', async () => {
  const { actor, cashUp } = await setup();
  const key = randomUUID();
  const first = await services.sales.create(actor, cashUp.id, pending, key);
  expect(first.sale).toMatchObject({ method: null, tipUsd: null, tipLbp: null, totalCollectedUsd: null, totalCollectedLbp: null, changeGivenUsd: null, changeGivenLbp: null, deliveredAt: null });
  expect(await prisma.sale.findUniqueOrThrow({ where: { id: first.saleId } })).toMatchObject({ method: null, totalCollectedUsd: null, tipUsd: null, changeGivenUsd: null });
  expect((await services.sales.create(actor, cashUp.id, pending, key)).replayed).toBe(true);
  await expect(services.sales.create(actor, cashUp.id, { ...pending, note: 'Different' }, key)).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  const edited = await services.sales.edit(actor, cashUp.id, first.saleId, { businessAmountUsd: '15', deliveryFeeUsd: '0', note: 'Changed' });
  expect(edited.sale).toMatchObject({ businessAmountUsd: '15.00', deliveryFeeUsd: '0.00', totalCollectedUsd: null, method: null });
  await expect(services.sales.edit(actor, cashUp.id, first.saleId, { totalCollectedUsd: '0' })).rejects.toMatchObject({ name: 'ZodError' });
  expect((await services.queries.getOwn(actor, cashUp.id)).ledger).toMatchObject({ receivedUsd: '0.00', receivedLbp: '0.00', changeGivenUsd: '0.00', changeGivenLbp: '0.00' });
});
it('saves final fee, tip, tender and status together; omission retains the original fee and zero replaces it', async () => {
  const { actor, cashUp } = await setup();
  const first = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  const result = await services.sales.confirmDelivery(actor, cashUp.id, first.saleId, { ...payment, deliveryFeeUsd: '0', tipUsd: '3', totalCollectedUsd: '20', changeGivenUsd: '8', method: 'WHISH' });
  expect(result.sale).toMatchObject({ deliveryFeeUsd: '0.00', tipUsd: '3.00', totalCollectedUsd: '20.00', changeGivenUsd: '8.00', method: 'WHISH', status: 'DELIVERED', amountDiffers: false, deliveredAt: expect.any(String) });
  const second = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  expect((await services.sales.confirmDelivery(actor, cashUp.id, second.saleId, payment)).sale).toMatchObject({ deliveryFeeUsd: '2.00', deliveryFeeLbp: '0.00', tipUsd: '0.00', amountDiffers: false });
});
it.each([
  ['ordinary change', { totalCollectedUsd: '20', changeGivenUsd: '9' }, false],
  ['equivalent LBP payment', { totalCollectedUsd: '0', totalCollectedLbp: '984500' }, false],
  ['mixed-currency change', { totalCollectedUsd: '20', changeGivenUsd: '6', changeGivenLbp: '268500' }, false],
  ['real discrepancy', { totalCollectedUsd: '12' }, true],
] as const)('accepts and flags %s correctly while preserving drawer movements', async (_name, changes, differs) => {
  const { actor, cashUp } = await setup();
  const first = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  const final = { ...payment, ...changes };
  expect((await services.sales.confirmDelivery(actor, cashUp.id, first.saleId, final)).sale.amountDiffers).toBe(differs);
  const ledger = (await services.queries.getOwn(actor, cashUp.id)).ledger;
  expect(ledger.receivedUsd).toBe(Number(final.totalCollectedUsd).toFixed(2));
  expect(ledger.receivedLbp).toBe(Number(final.totalCollectedLbp).toFixed(2));
  expect(ledger.changeGivenUsd).toBe(Number(final.changeGivenUsd).toFixed(2));
  expect(ledger.changeGivenLbp).toBe(Number(final.changeGivenLbp).toFixed(2));
});
it('rolls back delivery values when auditing fails after the sale update', async () => {
  const { actor, cashUp } = await setup();
  const first = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  const before = await prisma.sale.findUniqueOrThrow({ where: { id: first.saleId } });
  await prisma.$executeRawUnsafe(`CREATE FUNCTION reject_delivery_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action::text = 'SALE_DELIVERED' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_delivery_audit_test BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_delivery_audit_test()`);
  try {
    await expect(services.sales.confirmDelivery(actor, cashUp.id, first.saleId, { ...payment, deliveryFeeUsd: '0', tipUsd: '1' })).rejects.toBeDefined();
    expect(await prisma.sale.findUniqueOrThrow({ where: { id: first.saleId } })).toEqual(before);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER reject_delivery_audit_test ON audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION reject_delivery_audit_test()');
  }
});
