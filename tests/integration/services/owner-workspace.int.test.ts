import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { withTestMember } from '../../support/service-context';
import { prisma, resetDatabase, seedBusinesses, services, ownerActor, managerActor, staffActor } from './service-test-support';
import * as CashUps from '../../../src/modules/cash-ups/cash-ups.service';
import * as Sales from '../../../src/modules/sales/sales.service';

const revalidatePath = jest.fn();
jest.unstable_mockModule('next/cache', () => ({ revalidatePath }));
const actions = await import('../../../src/app/(owner)/owner/actions');
jest.setTimeout(25000);
beforeEach(async () => { await resetDatabase(); revalidatePath.mockClear(); });
afterAll(async () => { await prisma.$disconnect(); });
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', deliveryFeeUsd: '2', clientNumber: '+961123456' };
const payment = { method: 'CASH' as const, tipUsd: '1', tipLbp: '0', totalCollectedUsd: '20', totalCollectedLbp: '0', changeGivenUsd: '7', changeGivenLbp: '0' };
const run = <T>(actor: Awaited<ReturnType<typeof ownerActor>>, fn: () => T) => withTestMember(actor, prisma, fn);

it.each(['APPROVE', 'REFUSE'] as const)('persists deletion %s and shows refreshed request state without exposing OPEN financials', async decision => {
  const { businessA } = await seedBusinesses();
  const staff = await staffActor(businessA), owner = await ownerActor(businessA);
  const cashUp = await services.lifecycle.open(staff, {});
  const sale = await services.sales.create(staff, cashUp.id, pending, randomUUID());
  await services.sales.confirmDelivery(staff, cashUp.id, sale.saleId, payment);
  const before = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  const request = await run(staff, () => Sales.requestSaleDeletion(cashUp.id, sale.saleId, '  Customer cancelled  '));
  const screen = await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id));
  expect(screen.review).toBeNull();
  expect(screen.requests[0]).toMatchObject({ reason: 'Customer cancelled', canDecide: true, status: 'AWAITING_OWNER' });
  expect(await run(owner, () => actions.decideSaleDeletionAction(request.request.id, decision, '  Verified by owner  '))).toEqual({ ok: true });
  const updated = await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id));
  expect(updated.requests[0]).toMatchObject({ status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', canDecide: false, decisionReason: 'Verified by owner', decidedByName: expect.any(String) });
  const persisted = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  expect(persisted).toMatchObject({ status: decision === 'APPROVE' ? 'DELETED' : 'DELIVERED', deletionAwaiting: false, totalCollectedUsd: before.totalCollectedUsd, changeGivenUsd: before.changeGivenUsd, method: before.method });
  expect(await run(owner, () => actions.decideSaleDeletionAction(request.request.id, decision, 'Repeated decision'))).toMatchObject({ ok: false, code: 'REQUEST_ALREADY_DECIDED' });
  expect(revalidatePath).toHaveBeenCalledWith('/owner/cash-ups/' + cashUp.id + '/sales');
});
it('isolates lists and details and rejects cross-business, inactive and unauthorized action calls', async () => {
  const { businessA, businessB } = await seedBusinesses();
  const staff = await staffActor(businessA), owner = await ownerActor(businessA), foreign = await ownerActor(businessB);
  const cashUp = await services.lifecycle.open(staff, {});
  const sale = await services.sales.create(staff, cashUp.id, pending, randomUUID());
  await services.sales.confirmDelivery(staff, cashUp.id, sale.saleId, payment);
  const request = await run(staff, () => Sales.requestSaleDeletion(cashUp.id, sale.saleId, 'Cancellation'));
  expect(await run(foreign, CashUps.listOwnerCashUps)).toEqual([]);
  await expect(run(foreign, () => CashUps.getOwnerCashUpDetail(cashUp.id))).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  for (const actor of [foreign, staff, await managerActor(businessA)]) {
    const result = await run(actor, () => actions.decideSaleDeletionAction(request.request.id, 'APPROVE', 'Cancellation'));
    expect(result).toMatchObject({ ok: false, code: actor === foreign ? 'ENTITY_NOT_FOUND' : 'FORBIDDEN' });
  }
  await prisma.membership.update({ where: { id: owner.membershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
  expect(await run(owner, () => actions.decideSaleDeletionAction(request.request.id, 'REFUSE', 'Cancellation'))).toMatchObject({ ok: false, code: 'ACTOR_NOT_ACTIVE' });
  await expect(run(owner, CashUps.listOwnerCashUps)).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  expect((await prisma.request.findUniqueOrThrow({ where: { id: request.request.id } })).status).toBe('AWAITING_OWNER');
});
it.each(['approve', 'return'] as const)('connects cash-up %s and preserves reconciliation and edit history in the real detail', async operation => {
  const { businessA, businessB } = await seedBusinesses();
  const manager = await managerActor(businessA), owner = await ownerActor(businessA), foreign = await ownerActor(businessB);
  const cashUp = await services.lifecycle.open(manager, { floatUsd: '20' });
  const sale = await services.sales.create(manager, cashUp.id, pending, randomUUID());
  await services.sales.edit(manager, cashUp.id, sale.saleId, { note: 'Call on arrival' });
  await services.sales.confirmDelivery(manager, cashUp.id, sale.saleId, payment);
  await services.counts.replace(manager, cashUp.id, { lines: [{ currency: 'USD', denomination: '1.00', quantity: 33 }] });
  const submitted = await services.lifecycle.submit(manager, cashUp.id);
  const view = await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id));
  expect(view.review).toMatchObject({ expectedUsd: submitted.expectedUsd, countedUsd: '33.00', gapUsd: '0.00' });
  expect(view.edits).toEqual([expect.objectContaining({ field: 'note', newValue: 'Call on arrival', editedByName: expect.any(String) })]);
  expect(await run(foreign, () => actions.approveCashUpAction(cashUp.id))).toMatchObject({ ok: false, code: 'ENTITY_NOT_FOUND' });
  if (operation === 'return') {
    const otherOpen = await services.lifecycle.open(manager, {});
    expect(await run(owner, () => actions.returnCashUpAction(cashUp.id, 'Please recount'))).toMatchObject({ ok: false, code: 'CASHUP_ALREADY_OPEN' });
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).status).toBe('SUBMITTED');
    await services.lifecycle.voidOwnOpen(manager, otherOpen.id, 'Empty test cash-up');
  }
  const result = await run(owner, () => operation === 'approve' ? actions.approveCashUpAction(cashUp.id) : actions.returnCashUpAction(cashUp.id, '  Please recount  '));
  expect(result).toEqual({ ok: true });
  expect((await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id))).status).toBe(operation === 'approve' ? 'APPROVED' : 'OPEN');
  expect(await run(owner, () => actions.approveCashUpAction(cashUp.id))).toMatchObject({ ok: false });
});
it('allows solo-owner self-review reads and approval under the existing policy', async () => {
  const { soloBusiness } = await seedBusinesses();
  const owner = await ownerActor(soloBusiness);
  const cashUp = await services.lifecycle.open(owner, {});
  const sale = await services.sales.create(owner, cashUp.id, pending, randomUUID());
  await services.sales.confirmDelivery(owner, cashUp.id, sale.saleId, payment);
  await services.counts.replace(owner, cashUp.id, { lines: [] });
  await services.lifecycle.submit(owner, cashUp.id);
  expect((await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id))).canReview).toBe(true);
  expect(await run(owner, () => actions.approveCashUpAction(cashUp.id))).toEqual({ ok: true });
  expect((await run(owner, () => CashUps.getOwnerCashUpDetail(cashUp.id))).review?.selfApproved).toBe(true);
});
