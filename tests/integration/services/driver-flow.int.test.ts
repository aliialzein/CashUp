import { randomUUID } from 'node:crypto';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
import { legacyAmendmentFixtures } from '../../fixtures/legacy-amendments';
import { prisma, resetDatabase, seedBusinesses, services, staffActor, managerActor } from './service-test-support';
import { repositoriesForTest, makeSaleInput } from '../persistence/test-support';
const saleInput = createSaleSchema.parse({ status: 'DELIVERED', businessAmountUsd: '10', totalCollectedUsd: '10', method: 'CASH' });
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
it('reads the own open cash-up and zero counts, then freezes the same ledger on submit', async () => {
    const { businessA } = await seedBusinesses();
    const actor = await staffActor(businessA);
    expect(await services.queries.getOwnOpen(actor)).toBeNull();
    const opened = await services.lifecycle.open(actor, { floatUsd: '20' });
    expect((await services.queries.getOwnOpen(actor))?.id).toBe(opened.id);
    await expect(services.lifecycle.submit(actor, opened.id)).rejects.toMatchObject({ code: 'CASHUP_HAS_NO_SALES' });
    await services.sales.create(actor, opened.id, saleInput, randomUUID());
    await expect(services.lifecycle.submit(actor, opened.id)).rejects.toMatchObject({ code: 'COUNT_REQUIRED' });
    expect((await services.counts.getOwn(actor, opened.id)).saved).toBe(false);
    await services.counts.replace(actor, opened.id, { lines: [{ currency: 'USD', denomination: '5.00', quantity: 0 }] });
    expect(await services.counts.getOwn(actor, opened.id)).toMatchObject({ saved: true, lines: [{ denomination: '5.00', quantity: 0 }] });
    const preview = await services.queries.getOwn(actor, opened.id);
    expect(preview.ledger?.receivedUsd).toBe('10.00');
    const submitted = await services.lifecycle.submit(actor, opened.id);
    expect(submitted.expectedUsd).toBe(preview.ledger?.expectedUsd);
    expect(submitted).toMatchObject({ countedUsd: '0.00', gapUsd: '-30.00' });
    expect(await services.queries.getOwnOpen(actor)).toBeNull();
    expect((await services.queries.getOwn(actor, opened.id)).ledger).toBeNull();
    await expect(services.lifecycle.voidOwnOpen(actor, opened.id, 'Cannot void submitted')).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
    await services.lifecycle.approve(await managerActor(businessA), opened.id);
    await expect(services.lifecycle.voidOwnOpen(actor, opened.id, 'Cannot void approved')).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
});
it('voids only an own OPEN cash-up, retains child records and rejects later mutations', async () => {
    const { businessA, businessB } = await seedBusinesses();
    const actor = await staffActor(businessA);
    const opened = await services.lifecycle.open(actor, {});
    await services.sales.create(actor, opened.id, saleInput, randomUUID());
    for (const other of [await staffActor(businessA, 2), await staffActor(businessB)]) {
        await expect(services.queries.getOwn(other, opened.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        await expect(services.counts.getOwn(other, opened.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        await expect(services.lifecycle.voidOwnOpen(other, opened.id, 'Hidden')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    }
    expect(await services.lifecycle.voidOwnOpen(actor, opened.id, '  Shift cancelled  ')).toMatchObject({ status: 'VOID', voidReason: 'Shift cancelled' });
    expect(await prisma.sale.count({ where: { cashUpId: opened.id, status: 'DELIVERED' } })).toBe(1);
    await expect(services.counts.replace(actor, opened.id, { lines: [] })).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
    await expect(services.sales.create(actor, opened.id, saleInput, randomUUID())).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
    expect((await services.queries.listOwn(actor, { take: 10 }))[0]).toMatchObject({ number: 1, salesCount: 1, status: 'VOID' });
    expect(await prisma.auditLog.count({ where: { entityId: opened.id, action: 'CASHUP_VOIDED' } })).toBe(1);
});
it('inventories legacy pending changes and blocks writes without rewriting records', async () => {
    const { businessA } = await seedBusinesses();
    const actor = await staffActor(businessA);
    const opened = await services.lifecycle.open(actor, {});
    const { sale } = await services.sales.create(actor, opened.id, saleInput, randomUUID());
    const amendment = await prisma.amendment.create({
        data: {
            businessId: businessA.id, cashUpId: opened.id, proposedById: actor.membershipId,
            reason: 'Legacy fixture', changes: { create: legacyAmendmentFixtures.map(change => ({ ...change, saleId: sale.id })) }
        }, include: { changes: true }
    });
    const before = await prisma.auditLog.count();
    await expect(services.counts.replace(actor, opened.id, { lines: [] })).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
    await expect(services.lifecycle.submit(actor, opened.id)).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
    await expect(services.lifecycle.voidOwnOpen(actor, opened.id, 'No partial write')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
    expect(await prisma.amendmentChange.findMany({ where: { amendmentId: amendment.id } })).toEqual(expect.arrayContaining(amendment.changes));
    expect(await prisma.countEntry.count({ where: { cashUpId: opened.id } })).toBe(0);
    expect(await prisma.auditLog.count()).toBe(before);
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: opened.id } })).status).toBe('OPEN');
});
it('checks submission after a concurrent sale/count transaction commits under the cash-up lock', async () => {
    const { businessA } = await seedBusinesses();
    const actor = await staffActor(businessA);
    const opened = await services.lifecycle.open(actor, {});
    let acquired!: () => void;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const mutation = prisma.$transaction(async (tx) => {
        const repos = repositoriesForTest(businessA.id, tx);
        await repos.cashUps.lockOpenForUpdate(opened.id);
        acquired();
        await gate;
        await repos.sales.create(makeSaleInput(opened.id));
        await repos.counts.saveLines(opened.id, [{ currency: 'USD', denomination: '1.00', quantity: 0 }]);
    }, { maxWait: 5000, timeout: 15000 });
    await ready;
    const submission = services.lifecycle.submit(actor, opened.id);
    release();
    await mutation;
    await expect(submission).resolves.toMatchObject({ status: 'SUBMITTED', expectedUsd: '10.00', countedUsd: '0.00' });
});
