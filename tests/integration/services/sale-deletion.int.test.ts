import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { withTestMember } from '../../support/service-context';
import * as Sales from '../../../src/modules/sales/sales.service';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import { prisma, resetDatabase, seedBusinesses, services, staffActor, ownerActor, managerActor } from './service-test-support';

jest.setTimeout(25000);
beforeEach(resetDatabase);
afterEach(() => jest.restoreAllMocks());
afterAll(async () => { await prisma.$disconnect(); });
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', deliveryFeeUsd: '2', clientNumber: '+961123456' };
const payment = { method: 'CASH' as const, tipUsd: '1', tipLbp: '0', totalCollectedUsd: '20', totalCollectedLbp: '0', changeGivenUsd: '7', changeGivenLbp: '0' };
const request = (actor: CurrentMember, cashUpId: string, saleId: string, reason = 'Customer cancelled') => withTestMember(actor, prisma, () => Sales.requestSaleDeletion(cashUpId, saleId, reason));
const decide = (actor: CurrentMember, id: string, decision: 'APPROVE' | 'REFUSE' = 'APPROVE', reason = 'Confirmed cancellation') => withTestMember(actor, prisma, () => Sales.decideSaleDeletion(id, decision, reason));
const list = (actor: CurrentMember, cashUpId: string) => withTestMember(actor, prisma, () => Sales.listSaleDeletionRequests(cashUpId));
async function setup(solo = false) {
  const fixtures = await seedBusinesses();
  const business = solo ? fixtures.soloBusiness : fixtures.businessA;
  const actor = solo ? await ownerActor(business) : await staffActor(business);
  const owner = await ownerActor(business);
  const cashUp = await services.lifecycle.open(actor, {});
  const sale = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  return { ...fixtures, business, actor, owner, cashUp, sale };
}
async function snapshot(saleId: string) {
  return {
    sale: await prisma.sale.findUniqueOrThrow({ where: { id: saleId } }),
    requests: await prisma.request.findMany({ where: { saleId }, orderBy: { id: 'asc' } }),
    audits: await prisma.auditLog.findMany({ orderBy: { id: 'asc' } }),
    edits: await prisma.saleEdit.findMany({ where: { saleId } }),
  };
}
async function delivered() {
  const app = await setup();
  await services.sales.confirmDelivery(app.actor, app.cashUp.id, app.sale.saleId, payment);
  return app;
}
it('soft-deletes pending sales directly with a reason and blocks delivered direct deletion', async () => {
  const { actor, cashUp, sale } = await setup();
  await expect(services.sales.cancel(actor, cashUp.id, sale.saleId, 'x')).rejects.toMatchObject({ name: 'ZodError' });
  expect((await services.sales.cancel(actor, cashUp.id, sale.saleId, 'Customer cancelled')).sale).toMatchObject({ status: 'DELETED', cancelReason: 'Customer cancelled' });
  expect(await prisma.auditLog.count({ where: { entityId: sale.saleId, action: 'SALE_CANCELLED' } })).toBe(1);
  const second = await services.sales.create(actor, cashUp.id, pending, randomUUID());
  await services.sales.confirmDelivery(actor, cashUp.id, second.saleId, payment);
  const before = await snapshot(second.saleId);
  await expect(services.sales.cancel(actor, cashUp.id, second.saleId, 'Customer cancelled')).rejects.toMatchObject({ code: 'SALE_CANNOT_BE_CANCELLED' });
  expect(await snapshot(second.saleId)).toEqual(before);
});
it.each(['APPROVE', 'REFUSE'] as const)('%s resolves atomically, preserves payment history and updates only live ledger inclusion', async decision => {
  const { actor, owner, cashUp, sale } = await delivered();
  const before = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  const ledger = (await services.queries.getOwn(actor, cashUp.id)).ledger;
  expect(ledger).toMatchObject({ receivedUsd: '20.00', changeGivenUsd: '7.00' });
  const created = await request(actor, cashUp.id, sale.saleId);
  expect(created.sale).toMatchObject({ status: 'DELIVERED', deletionAwaiting: true });
  expect(created.request).toMatchObject({ status: 'AWAITING_OWNER', reason: 'Customer cancelled', requestedById: actor.membershipId, decidedAt: null });
  expect((await services.queries.getOwn(actor, cashUp.id)).ledger).toEqual(ledger);
  expect(await list(owner, cashUp.id)).toEqual([created.request]);
  expect(await list(actor, cashUp.id)).toEqual([created.request]);
  expect((await services.queries.getOwn(actor, cashUp.id)).requests).toEqual([created.request]);
  const resolved = await decide(owner, created.request.id, decision);
  expect(resolved.request).toMatchObject({ status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedById: owner.membershipId, decisionReason: 'Confirmed cancellation', selfApproved: false, decidedAt: expect.any(String) });
  const after = await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } });
  expect(after).toEqual({ ...before, status: decision === 'APPROVE' ? 'DELETED' : 'DELIVERED', deletedAt: decision === 'APPROVE' ? expect.any(Date) : null, updatedAt: expect.any(Date), deletionAwaiting: false });
  expect((await services.queries.getOwn(actor, cashUp.id)).ledger).toEqual(decision === 'REFUSE' ? ledger : expect.objectContaining({ receivedUsd: '0.00', changeGivenUsd: '0.00' }));
  const settled = await snapshot(sale.saleId);
  await expect(decide(owner, created.request.id, decision === 'APPROVE' ? 'REFUSE' : 'APPROVE')).rejects.toMatchObject({ code: 'REQUEST_ALREADY_DECIDED' });
  expect(await snapshot(sale.saleId)).toEqual(settled);
  expect(await prisma.auditLog.count({ where: { entityId: created.request.id, action: decision === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED' } })).toBe(1);
  if (decision === 'REFUSE') expect((await request(actor, cashUp.id, sale.saleId)).request.id).not.toBe(created.request.id);
  else await expect(request(actor, cashUp.id, sale.saleId)).rejects.toMatchObject({ code: 'SALE_ALREADY_CANCELLED' });
});
it('enforces owner-only decisions, active membership, ownership and business isolation', async () => {
  const { actor, owner, businessA, businessB, cashUp, sale } = await delivered();
  const manager = await managerActor(businessA);
  const otherStaff = await staffActor(businessA, 2);
  const foreignOwner = await ownerActor(businessB);
  await expect(request(otherStaff, cashUp.id, sale.saleId)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  await expect(request(foreignOwner, cashUp.id, sale.saleId)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  const created = await request(actor, cashUp.id, sale.saleId);
  const before = await snapshot(sale.saleId);
  for (const member of [actor, manager]) await expect(decide(member, created.request.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(decide(foreignOwner, created.request.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  await expect(list(otherStaff, cashUp.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  await expect(list(foreignOwner, cashUp.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  await prisma.membership.update({ where: { id: owner.membershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
  await expect(decide(owner, created.request.id)).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  expect(await snapshot(sale.saleId)).toEqual(before);
});
it('records solo owner self-approval honestly and requires the request path', async () => {
  const { actor, cashUp, sale, business } = await setup(true);
  await services.sales.confirmDelivery(actor, cashUp.id, sale.saleId, payment);
  await expect(services.sales.cancel(actor, cashUp.id, sale.saleId, 'Owner cancellation')).rejects.toMatchObject({ code: 'SALE_CANNOT_BE_CANCELLED' });
  const created = await request(actor, cashUp.id, sale.saleId);
  // A business becoming non-solo must not bypass the existing self-review convention.
  await prisma.business.update({ where: { id: business.id }, data: { isSolo: false } });
  await expect(decide(actor, created.request.id)).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
  await expect(decide(actor, created.request.id, 'REFUSE')).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
  await prisma.business.update({ where: { id: business.id }, data: { isSolo: true } });
  const result = await decide(actor, created.request.id);
  expect(result.request).toMatchObject({ selfApproved: true, requestedById: actor.membershipId, decidedById: actor.membershipId });
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: created.request.id, action: 'REQUEST_APPROVED' } });
  expect(audit.metadata).toMatchObject({ selfApproved: true });
});
it.each(['SUBMITTED', 'APPROVED', 'VOID'] as const)('blocks request and decision on %s cash-ups without changing frozen values', async status => {
  const { actor, owner, cashUp, sale } = await delivered();
  const created = await request(actor, cashUp.id, sale.saleId);
  await prisma.cashUp.update({ where: { id: cashUp.id }, data: { status, expectedUsd: '13', countedUsd: '13', gapUsd: '0' } });
  const before = await snapshot(sale.saleId);
  const parent = await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } });
  await expect(request(actor, cashUp.id, sale.saleId)).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
  await expect(decide(owner, created.request.id)).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
  expect(await snapshot(sale.saleId)).toEqual(before);
  expect(await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).toEqual(parent);
});
it('rejects pending, deleted, invalid-reason and duplicate requests without side effects', async () => {
  const { actor, cashUp, sale } = await setup();
  await expect(request(actor, cashUp.id, sale.saleId)).rejects.toMatchObject({ code: 'SALE_DELETION_REQUIRES_DELIVERED' });
  await services.sales.confirmDelivery(actor, cashUp.id, sale.saleId, payment);
  const before = await snapshot(sale.saleId);
  await expect(request(actor, cashUp.id, sale.saleId, 'x')).rejects.toMatchObject({ name: 'ZodError' });
  expect(await snapshot(sale.saleId)).toEqual(before);
  const outcomes = await Promise.allSettled([request(actor, cashUp.id, sale.saleId), request(actor, cashUp.id, sale.saleId)]);
  expect(outcomes.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.find(item => item.status === 'rejected')).toMatchObject({ reason: { code: 'SALE_DELETION_REQUEST_EXISTS' } });
  expect(await prisma.request.count({ where: { saleId: sale.saleId } })).toBe(1);
  expect(await prisma.auditLog.count({ where: { action: 'REQUEST_CREATED' } })).toBe(1);
});
it.each(['request', 'approve', 'refuse'] as const)('rolls back all sale/request/audit effects when %s auditing fails', async operation => {
  const { actor, owner, cashUp, sale } = await delivered();
  const created = operation === 'request' ? null : await request(actor, cashUp.id, sale.saleId);
  const before = await snapshot(sale.saleId);
  const rejectedAction = operation === 'request' ? 'SALE_LOCKED_FOR_DELETION' : operation === 'approve' ? 'SALE_DELETED' : 'REQUEST_REJECTED';
  // Reject the second audit for request/approval, after an audit was already inserted.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION reject_deletion_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action::text = '${rejectedAction}' THEN RAISE EXCEPTION 'test deletion audit failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_deletion_audit_test BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_deletion_audit_test()`);
  try {
    await expect(operation === 'request' ? request(actor, cashUp.id, sale.saleId) : decide(owner, created!.request.id, operation === 'approve' ? 'APPROVE' : 'REFUSE')).rejects.toBeDefined();
    expect(await snapshot(sale.saleId)).toEqual(before);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER reject_deletion_audit_test ON audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION reject_deletion_audit_test()');
  }
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
it.each(['APPROVE', 'REFUSE'] as const)('serializes competing decisions with %s first on the shared cash-up lock', async firstDecision => {
  const { actor, owner, cashUp, sale } = await delivered();
  const created = await request(actor, cashUp.id, sale.saleId);
  const acquired = deferred(), release = deferred();
  const original = CashUpRepository.prototype.lockForUpdate;
  let firstLock = true;
  jest.spyOn(CashUpRepository.prototype, 'lockForUpdate').mockImplementation(async function(this: CashUpRepository, id: string) {
    const result = await original.call(this, id);
    if (id === cashUp.id && firstLock) { firstLock = false; acquired.resolve(); await release.promise; }
    return result;
  });
  const first = decide(owner, created.request.id, firstDecision);
  const firstOutcome = first.then(value => ({ value, error: null }), error => ({ value: null, error }));
  let secondOutcome: typeof firstOutcome | undefined;
  try {
    await Promise.race([acquired.promise, first.then(() => { throw new Error('Missed lock barrier'); })]);
    secondOutcome = decide(owner, created.request.id, firstDecision === 'APPROVE' ? 'REFUSE' : 'APPROVE').then(value => ({ value, error: null }), error => ({ value: null, error }));
    const deadline = Date.now() + 5000;
    let waiting = false;
    while (Date.now() < deadline) {
      const rows = await prisma.$queryRaw<Array<{ waiting: number }>>`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE '%FROM "cash_ups"%' AND query LIKE '%FOR UPDATE%'`;
      if (rows[0].waiting > 0) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect(waiting).toBe(true);
  } finally { release.resolve(); await firstOutcome; if (secondOutcome) await secondOutcome; }
  expect((await firstOutcome).error).toBeNull();
  expect((await secondOutcome!).error).toMatchObject({ code: 'REQUEST_ALREADY_DECIDED' });
  expect(await prisma.request.findUniqueOrThrow({ where: { id: created.request.id } })).toMatchObject({ status: firstDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED' });
  expect(await prisma.sale.findUniqueOrThrow({ where: { id: sale.saleId } })).toMatchObject({ status: firstDecision === 'APPROVE' ? 'DELETED' : 'DELIVERED', deletionAwaiting: false });
  expect(await prisma.auditLog.count({ where: { entityId: created.request.id, action: { in: ['REQUEST_APPROVED', 'REQUEST_REJECTED'] } } })).toBe(1);
});
