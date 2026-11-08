import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { prisma, resetDatabase, seedBusinesses, staffActor } from './service-test-support';
import { withTestMember } from '../../support/service-context';
import { getBusiness } from '../../../src/modules/business/business.service';
import { openCashUp, getOwnOpenCashUp, replaceOwnCounts, submitCashUp } from '../../../src/modules/cash-ups/cash-ups.service';
import { createSale, editSale, confirmSaleDelivery } from '../../../src/modules/sales/sales.service';
import { createCashOut } from '../../../src/modules/cash-outs/cash-outs.service';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
import { lockCurrentMember } from '../../../src/modules/auth/auth.service';
import { BusinessRepository } from '../../../src/modules/business/business.repository';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';

jest.setTimeout(20000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve: () => resolve() };
}
async function waitForMembershipWait() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw<Array<{ waiting: number }>>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock' AND query LIKE '%"memberships"%'
    `;
    if (rows[0]?.waiting) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected a transaction waiting on the membership row');
}

it('resolves simultaneous identities independently and rejects inactive/cross-business members', async () => {
  const { businessA, businessB } = await seedBusinesses();
  const a = await staffActor(businessA), b = await staffActor(businessB);
  const results = await Promise.all([
    withTestMember(a, prisma, () => getBusiness()),
    withTestMember(b, prisma, () => getBusiness()),
  ]);
  expect(results.map(row => row.id)).toEqual([businessA.id, businessB.id]);
  await expect(withTestMember({ ...a, businessId: b.businessId }, prisma, () => getBusiness())).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  await prisma.membership.update({ where: { id: a.membershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
  await expect(withTestMember(a, prisma, () => getOwnOpenCashUp())).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
});

it('rejects a member deactivated after pre-transaction resolution but before the write lock', async () => {
  const { businessA } = await seedBusinesses();
  const member = await staffActor(businessA);
  const opened = await withTestMember(member, prisma, () => openCashUp({}));
  const ready = deferred(), release = deferred();
  const holder = prisma.$transaction(async tx => {
    await tx.membership.update({ where: { id: member.membershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
    ready.resolve();
    await release.promise;
  }, { maxWait: 5000, timeout: 15000 });
  await ready.promise;
  const write = withTestMember(member, prisma, () => createCashOut(opened.id, { amountUsd: '1.00', amountLbp: '0.00', reason: 'Fuel', idempotencyKey: randomUUID() }));
  try { await waitForMembershipWait(); } finally { release.resolve(); }
  await holder;
  await expect(write).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  expect(await prisma.cashOut.count({ where: { cashUpId: opened.id } })).toBe(0);
});

it('lets a locked member workflow audit commit before business administration changes that member', async () => {
  const { businessA } = await seedBusinesses();
  const member = await staffActor(businessA);
  const ready = deferred(), release = deferred();
  const financial = prisma.$transaction(async tx => {
    await lockCurrentMember(member, tx);
    ready.resolve();
    await release.promise;
    await new AuditRepository(member.businessId, tx).append({ actorUserId: member.userId, action: 'COUNT_UPDATED', entityType: 'BUSINESS', entityId: member.businessId });
  }, { maxWait: 5000, timeout: 15000 });
  await ready.promise;
  const administration = prisma.$transaction(async tx => {
    await new BusinessRepository(member.businessId, tx).lockBusiness();
    await tx.membership.update({ where: { id: member.membershipId }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
  }, { maxWait: 5000, timeout: 15000 });
  try { await waitForMembershipWait(); } finally { release.resolve(); }
  await Promise.all([financial, administration]);
  expect((await prisma.membership.findUniqueOrThrow({ where: { id: member.membershipId } })).status).toBe('INACTIVE');
  expect(await prisma.auditLog.count({ where: { businessId: member.businessId, action: 'COUNT_UPDATED' } })).toBe(1);
});

it('preserves duplicate/mismatch protection and refuses both original and edited-payload replay after edits', async () => {
  const { businessA } = await seedBusinesses();
  const member = await staffActor(businessA);
  await withTestMember(member, prisma, async () => {
    const opened = await openCashUp({});
    const command = { ...createSaleSchema.parse({ businessAmountUsd: '10', totalCollectedUsd: '10', method: 'CASH', status: 'DELIVERED' }), idempotencyKey: randomUUID() };
    const first = await createSale(opened.id, command);
    expect((await createSale(opened.id, command)).replayed).toBe(true);
    await expect(createSale(opened.id, { ...command, note: 'different command' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    await editSale(opened.id, first.saleId, { note: 'edited later' });
    const auditCount = await prisma.auditLog.count({ where: { businessId: member.businessId } });
    for (const retry of [command, { ...command, note: 'edited later' }]) {
      await expect(createSale(opened.id, retry)).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY_UNVERIFIABLE' });
    }
    expect(await prisma.auditLog.count({ where: { businessId: member.businessId } })).toBe(auditCount);
    expect(await prisma.sale.count({ where: { cashUpId: opened.id } })).toBe(1);
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: opened.id } })).lastSaleNumber).toBe(1);
    await replaceOwnCounts(opened.id, { lines: [{ currency: 'USD', denomination: '1.00', quantity: 0 }] });
    await submitCashUp(opened.id);
    await expect(createSale(opened.id, command)).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
  });
});

it('does not accept a matching mutable current payload after delivery confirmation', async () => {
  const { businessA } = await seedBusinesses();
  const member = await staffActor(businessA);
  await withTestMember(member, prisma, async () => {
    const opened = await openCashUp({});
    const command = { ...createSaleSchema.parse({ businessAmountUsd: '10', totalCollectedUsd: '10', method: 'CASH', status: 'TO_DELIVER', clientNumber: '+9611234567' }), idempotencyKey: randomUUID() };
    const first = await createSale(opened.id, command);
    await confirmSaleDelivery(opened.id, first.saleId, { totalCollectedUsd: '10.00', totalCollectedLbp: '0.00', changeGivenUsd: '0.00', changeGivenLbp: '0.00', method: 'CASH' });
    for (const retry of [command, { ...command, status: 'DELIVERED' as const }]) {
      await expect(createSale(opened.id, retry)).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY_UNVERIFIABLE' });
    }
  });
});
