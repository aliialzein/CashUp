import { withTestMember } from '../../support/service-context';
jest.mock('../../../src/modules/audit/audit.service', () => ({ recordAudit: jest.fn() }));
import * as auditFunctions from '../../../src/modules/audit/audit.service';
import { Prisma, type CashUp, type Sale, type CountEntry, type CashOut } from '../../../src/generated/prisma/client';
import * as CashUpQueryService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import * as SaleService from '../../../src/modules/sales/sales.service';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import { countDenominations } from '../../../src/domain/money/cash-up-totals';
import { NotFoundError } from '../../../src/shared/errors/persistence-errors';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
import { legacyAmendmentFixtures } from '../../fixtures/legacy-amendments';
import { mockRepositories, testDatabase } from './repository-mocks';
import { actor, date, cashUp, sale, count, cashOut, deliveredTotals } from './driver-fixtures';
function setup(options: {
    row?: CashUp;
    sales?: Sale[];
    counts?: CountEntry[];
    cashOuts?: CashOut[];
    fields?: (string | null)[];
    solo?: boolean;
    missingBusiness?: boolean;
} = {}) {
    let row = options.row ?? cashUp();
    const sales = options.sales ?? [sale()];
    const counts = options.counts ?? [count()];
    const expenses = options.cashOuts ?? [cashOut()];
    const summary = {
        total: sales.length, delivered: sales.filter(s => s.status === 'DELIVERED').length,
        toDeliver: sales.filter(s => s.status === 'TO_DELIVER').length, deleted: sales.filter(s => s.status === 'DELETED').length
    };
    const repos = mockRepositories({
        businesses: { findSettings: async () => options.missingBusiness ? null : ({ id: actor.businessId, name: 'Shop', isSolo: options.solo ?? false }) },
        cashUps: {
            findOwn: async function (id, member) { return id === row.id && member === row.membershipId && Reflect.get(this, 'businessId') === row.businessId ? row : null; },
            findOpenByMembership: async function (member) { return row.status === 'OPEN' && member === row.membershipId && Reflect.get(this, 'businessId') === row.businessId ? row : null; },
            findById: async () => row,
            lockForUpdate: async function () {
                if (Reflect.get(this, 'businessId') !== row.businessId)
                    throw new NotFoundError('Cash-up');
                return row;
            },
            pendingSaleAmendmentFields: async () => (options.fields ?? []).map(field => ({ field })),
            listOwn: jest.fn(async () => [{ ...row, _count: { sales: sales.length } }]),
            submit: jest.fn(async (_id, snapshot) => {
                row = {
                    ...row, status: 'SUBMITTED', closedAt: date,
                    ...Object.fromEntries(Object.entries(snapshot).map(([field, value]) => [field, new Prisma.Decimal(value)]))
                };
                return row;
            }),
            voidCashUp: jest.fn(async (_id, reason) => { row = { ...row, status: 'VOID', voidedAt: date, voidReason: reason }; return row; }),
            approve: jest.fn(async () => row), returnToOpen: jest.fn(async () => row),
        },
        requests: { countAwaitingByCashUp: async () => 0 },
        memberships: { findById: async () => ({ id: actor.membershipId, userId: actor.userId, businessId: actor.businessId, role: 'STAFF', status: 'ACTIVE', joinedAt: date, deactivatedAt: null }) },
        sales: {
            create: jest.fn(async () => ({ sale: sales[0] ?? sale(), created: true })), list: async () => sales, countByStatus: async () => summary, countAwaitingDelivery: async () => summary.toDeliver,
            flagCounts: async () => ({ total: summary.total, deleted: summary.deleted, edited: 0, amountDiffers: 0, deletionAwaiting: 0 }),
            totalsByCurrencyAndMethod: async () => deliveredTotals(sales),
            changeGivenByCurrency: async () => sales.filter(s => s.status === 'DELIVERED').flatMap(s => [
                { currency: 'USD' as const, total: s.changeGivenUsd }, { currency: 'LBP' as const, total: s.changeGivenLbp }
            ]),
        },
        counts: { listByCashUp: async () => counts, countedTotals: async () => { const totals = countDenominations(counts); return { USD: new Prisma.Decimal(totals.USD), LBP: new Prisma.Decimal(totals.LBP) }; } },
        cashOuts: { create: jest.fn(async () => ({ cashOut: expenses[0] ?? cashOut(), created: true })), listByCashUp: async () => expenses },
    });
    const saleFindFirst = jest.fn(async () => sales[0] ? { id: sales[0].id } : null);
    const db = testDatabase(saleFindFirst);
    const audit = { record: jest.mocked(auditFunctions.recordAudit).mockReset().mockResolvedValue(undefined) };
    return { db, audit, repos, sales, expenses, saleFindFirst, row: () => row, query: {
            getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getOwnCashUp>[0]) => withTestMember(arg0, db, () => CashUpQueryService.getOwnCashUp(arg1)),
            getOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.getOwnOpenCashUp()),
            listOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listOwnCashUps>[0]) => withTestMember(arg0, db, () => CashUpQueryService.listOwnCashUps(arg1)),
            listOpenSummaries: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.listOpenCashUpSummaries()),
            listSubmitted: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.listSubmittedCashUps()),
            listReviewed: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listReviewedCashUps>[0]) => withTestMember(arg0, db, () => CashUpQueryService.listReviewedCashUps(arg1)),
            getReviewDetail: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getCashUpReview>[0]) => withTestMember(arg0, db, () => CashUpQueryService.getCashUpReview(arg1))
        }, lifecycle: {
            open: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.openCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.openCashUp(arg1)),
            submit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.submitCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.submitCashUp(arg1)),
            approve: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.approveCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.approveCashUp(arg1)),
            returnToOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[0], arg2: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.returnCashUpToOpen(arg1, arg2)),
            voidOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[0], arg2: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.voidOwnOpenCashUp(arg1, arg2))
        }, counts: {
            getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, db, () => CountService.getOwnCounts(arg1)),
            replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, db, () => CountService.replaceOwnCounts(arg1, arg2))
        } };
}
describe('own open reads and history', () => {
    it('returns scoped detail through the indexed open lookup, never a history scan', async () => {
        const app = setup();
        expect(await app.query.getOwnOpen(actor)).toMatchObject({ id: '10000000-0000-4000-8000-000000000001', number: 7, ledger: { receivedUsd: '12.00' } });
        expect(app.db.$transaction).not.toHaveBeenCalled();
        expect(app.repos.cashUps.listOwn).not.toHaveBeenCalled();
    });
    it.each(['SUBMITTED', 'APPROVED', 'VOID'] as const)('returns null without an OPEN cash-up (%s)', async (status) => {
        expect(await setup({ row: cashUp({ status }) }).query.getOwnOpen(actor)).toBeNull();
    });
    it.each([{ ...actor, businessId: 'other-business' }, { ...actor, membershipId: 'other-member' }])('hides another scope %j', async (other) => {
        const app = setup();
        expect(await app.query.getOwnOpen(other)).toBeNull();
        await expect(app.query.getOwn(other, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        await expect(app.counts.getOwn(other, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        await expect(app.lifecycle.voidOwnOpen(other, '10000000-0000-4000-8000-000000000001', 'Cancelled')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('keeps owner authorization and allows the solo owner', async () => {
        const owner = { ...actor, role: 'OWNER' as const };
        await expect(setup().query.getOwnOpen(owner)).rejects.toMatchObject({ code: 'FORBIDDEN' });
        expect(await setup({ solo: true }).query.getOwnOpen(owner)).not.toBeNull();
        await expect(setup({ missingBusiness: true }).query.getOwnOpen(actor)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    });
    it('returns recorded salesCount, including waiting/deleted, with ISO dates and nullable gaps', async () => {
        const app = setup({ sales: [sale(), sale({ status: 'TO_DELIVER' }), sale({ status: 'DELETED' })] });
        expect(await app.query.listOwn(actor, { take: 5, cursorId: '10000000-0000-4000-8000-000000000002' })).toEqual([expect.objectContaining({
                number: 7, salesCount: 3,
                openedAt: date.toISOString(), status: 'OPEN', returnReason: null, gapUsd: null, gapLbp: null
            })]);
    });
});
describe('live ledger and saved counts', () => {
    const sales = [sale(), sale({ method: 'WHISH', totalCollectedUsd: new Prisma.Decimal('50'), changeGivenUsd: new Prisma.Decimal('2'), changeGivenLbp: new Prisma.Decimal('200') }),
        sale({ method: 'OMT', totalCollectedUsd: new Prisma.Decimal('30'), changeGivenUsd: new Prisma.Decimal('3'), changeGivenLbp: new Prisma.Decimal('300') }),
        sale({ status: 'DELETED', totalCollectedUsd: new Prisma.Decimal('999') })];
    it('matches submission using delivered CASH receipts, change across all methods and active cash-outs', async () => {
        const app = setup({ sales, cashOuts: [cashOut(), cashOut({ status: 'CANCELLED', amountUsd: new Prisma.Decimal('999') })] });
        const own = await app.query.getOwn(actor, '10000000-0000-4000-8000-000000000001');
        expect(own.ledger).toEqual({
            floatUsd: '20.00', floatLbp: '1000.00', receivedUsd: '12.00', receivedLbp: '3000.00',
            changeGivenUsd: '6.00', changeGivenLbp: '600.00', cashOutsUsd: '2.00', cashOutsLbp: '200.00', expectedUsd: '24.00', expectedLbp: '3200.00'
        });
        const submitted = await app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001');
        expect(submitted).toMatchObject({ expectedUsd: own.ledger.expectedUsd, expectedLbp: own.ledger.expectedLbp, countedUsd: '0.00', gapUsd: '-24.00', gapLbp: '-3200.00' });
        const afterSubmit = await app.query.getOwn(actor, '10000000-0000-4000-8000-000000000001');
        expect(afterSubmit.ledger).toEqual(own.ledger);
        expect(afterSubmit).toMatchObject({ expectedUsd: '24.00', expectedLbp: '3200.00', gapUsd: '-24.00', gapLbp: '-3200.00' });
    });
    it('excludes waiting collections and change but still refuses submission', async () => {
        const app = setup({ sales: [sale({ status: 'TO_DELIVER' })] });
        expect((await app.query.getOwn(actor, '10000000-0000-4000-8000-000000000001')).ledger).toMatchObject({ receivedUsd: '0.00', receivedLbp: '0.00', changeGivenUsd: '0.00', changeGivenLbp: '0.00' });
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'SALES_AWAITING_DELIVERY' });
    });
    it.each(['OPEN', 'SUBMITTED', 'APPROVED', 'VOID'] as const)('calculates the %s ledger independently from its saved snapshot', async (status) => {
        const row = cashUp({ status, expectedUsd: new Prisma.Decimal('777'), expectedLbp: new Prisma.Decimal('888'), countedUsd: new Prisma.Decimal('776'), countedLbp: new Prisma.Decimal('886'), gapUsd: new Prisma.Decimal('-1'), gapLbp: new Prisma.Decimal('-2') });
        const before = JSON.stringify(row);
        const app = setup({ row });
        const own = await app.query.getOwn(actor, '10000000-0000-4000-8000-000000000001');
        expect(own.ledger).toMatchObject({ expectedUsd: '29.00', expectedLbp: '3700.00' });
        expect(own).toMatchObject({ expectedUsd: '777.00', expectedLbp: '888.00', countedUsd: '776.00', countedLbp: '886.00', gapUsd: '-1.00', gapLbp: '-2.00' });
        expect(app.repos.cashUps.submit).not.toHaveBeenCalled();
        expect(JSON.stringify(app.row())).toEqual(before);
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('returns a ledger for a returned-to-OPEN cash-up without rebuilding its cleared snapshot', async () => {
        const row = cashUp({ status: 'OPEN', returnReason: 'Recount' });
        const before = JSON.stringify(row);
        const app = setup({ row });
        const own = await app.query.getOwn(actor, row.id);
        expect(own.ledger).toMatchObject({ expectedUsd: '29.00', expectedLbp: '3700.00' });
        expect(own).toMatchObject({ status: 'OPEN', returnReason: 'Recount', expectedUsd: null, expectedLbp: null, countedUsd: null, countedLbp: null, gapUsd: null, gapLbp: null });
        expect(JSON.stringify(app.row())).toEqual(before);
        expect(app.repos.cashUps.submit).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('distinguishes no count from saved zeros, including an explicit empty save marker', async () => {
        expect(await setup({ counts: [] }).counts.getOwn(actor, '10000000-0000-4000-8000-000000000001')).toMatchObject({ saved: false, countStartedAt: null, lines: [], countedTotals: { USD: '0.00', LBP: '0.00' } });
        expect(await setup().counts.getOwn(actor, '10000000-0000-4000-8000-000000000001')).toMatchObject({ saved: true, lines: [{ denomination: '5.00', quantity: 0 }] });
        const app = setup({ counts: [], row: cashUp({ countStartedAt: date }) });
        expect(await app.counts.getOwn(actor, '10000000-0000-4000-8000-000000000001')).toMatchObject({ saved: true, countStartedAt: date.toISOString() });
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).resolves.toMatchObject({ countedUsd: '0.00' });
    });
    it('preserves the existing read authorization', async () => {
        await expect(setup().counts.getOwn({ ...actor, role: 'OWNER' }, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'FORBIDDEN' });
        await expect(setup({ missingBusiness: true }).counts.getOwn(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    });
});
describe('submission and own cancellation', () => {
    it.each([{ sales: [] }, { sales: [sale({ status: 'DELETED' })] }])('rejects no non-deleted sales', async ({ sales }) => {
        const app = setup({ sales });
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'CASHUP_HAS_NO_SALES' });
        expect(app.repos.cashUps.submit).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('requires a save and accepts quantities of zero', async () => {
        const app = setup({ counts: [] });
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'COUNT_REQUIRED' });
        expect(app.repos.cashUps.submit).not.toHaveBeenCalled();
        await expect(setup({ counts: [count()] }).lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).resolves.toMatchObject({ status: 'SUBMITTED', countedUsd: '0.00' });
    });
    it('voids atomically, audits the trimmed reason, retains records and blocks subsequent writes', async () => {
        const app = setup({ sales: [] });
        expect(await app.lifecycle.voidOwnOpen(actor, '10000000-0000-4000-8000-000000000001', '  Shift cancelled  ')).toMatchObject({ status: 'VOID', voidReason: 'Shift cancelled', voidedAt: date.toISOString() });
        expect(app.audit.record).toHaveBeenCalledWith(expect.anything(), actor, expect.objectContaining({ action: 'CASHUP_VOIDED', metadata: { reason: 'Shift cancelled' } }));
        expect(app.saleFindFirst).toHaveBeenCalledWith({
            where: { businessId: actor.businessId, cashUpId: '10000000-0000-4000-8000-000000000001' },
            select: { id: true },
        });
        expect(app.sales).toHaveLength(0);
        expect(app.expenses[0].status).toBe('ACTIVE');
        await expect(app.counts.replace(actor, '10000000-0000-4000-8000-000000000001', { lines: [] })).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
        const input = createSaleSchema.parse({ status: 'DELIVERED', businessAmountUsd: '1', totalCollectedUsd: '1', method: 'CASH' });
        await expect({
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.createSale>[0], arg2: Omit<Parameters<typeof SaleService.createSale>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => SaleService.createSale(arg1, { ...arg2, idempotencyKey: arg3 })),
            edit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.editSale>[0], arg2: Parameters<typeof SaleService.editSale>[1], arg3: Parameters<typeof SaleService.editSale>[2]) => withTestMember(arg0, app.db, () => SaleService.editSale(arg1, arg2, arg3)),
            confirmDelivery: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.confirmSaleDelivery>[0], arg2: Parameters<typeof SaleService.confirmSaleDelivery>[1], arg3: Parameters<typeof SaleService.confirmSaleDelivery>[2]) => withTestMember(arg0, app.db, () => SaleService.confirmSaleDelivery(arg1, arg2, arg3)),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.cancelSale>[0], arg2: Parameters<typeof SaleService.cancelSale>[1], arg3: Parameters<typeof SaleService.cancelSale>[2]) => withTestMember(arg0, app.db, () => SaleService.cancelSale(arg1, arg2, arg3))
        }.create(actor, '10000000-0000-4000-8000-000000000001', input, '9ebfd3da-4a78-4201-8123-cb64ee681245')).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
        await expect({
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, app.db, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
        }.create(actor, '10000000-0000-4000-8000-000000000001', { amountUsd: '1', amountLbp: '0', reason: 'Fuel' }, '9ebfd3da-4a78-4201-8123-cb64ee681245')).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it('does not void or audit a cash-up that contains a sale', async () => {
        const app = setup({ sales: [sale()] });
        await expect(app.lifecycle.voidOwnOpen(actor, '10000000-0000-4000-8000-000000000001', 'Shift cancelled'))
            .rejects.toMatchObject({ code: 'CASHUP_NOT_EMPTY' });
        expect(app.saleFindFirst).toHaveBeenCalled();
        expect(app.repos.cashUps.voidCashUp).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it.each(['SUBMITTED', 'APPROVED', 'VOID'] as const)('refuses direct cancellation of %s', async (status) => {
        const app = setup({ row: cashUp({ status }) });
        await expect(app.lifecycle.voidOwnOpen(actor, '10000000-0000-4000-8000-000000000001', 'Cancelled')).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
        expect(app.repos.cashUps.voidCashUp).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it.each(['', '  ', 'x', 'bad\treason'])('rejects invalid reason %j before a transaction', async (reason) => {
        const app = setup();
        await expect(app.lifecycle.voidOwnOpen(actor, '10000000-0000-4000-8000-000000000001', reason)).rejects.toMatchObject({ code: 'VOID_REASON_INVALID' });
        expect(app.db.$transaction).not.toHaveBeenCalled();
    });
    it('retains non-solo owner restrictions', async () => {
        await expect(setup().lifecycle.voidOwnOpen({ ...actor, role: 'OWNER' }, '10000000-0000-4000-8000-000000000001', 'Cancelled')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
});
describe('pending amendment safety', () => {
    it.each(legacyAmendmentFixtures)('rejects legacy $field before any mutation without rewriting history', async (record) => {
        const app = setup({ fields: ['businessAmountUsd', record.field] });
        const before = { ...record };
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        await expect(app.counts.replace(actor, '10000000-0000-4000-8000-000000000001', { lines: [] })).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        await expect(app.lifecycle.voidOwnOpen(actor, '10000000-0000-4000-8000-000000000001', 'Cancelled')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        const input = createSaleSchema.parse({ status: 'DELIVERED', businessAmountUsd: '1', totalCollectedUsd: '1', method: 'CASH' });
        await expect({
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.createSale>[0], arg2: Omit<Parameters<typeof SaleService.createSale>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => SaleService.createSale(arg1, { ...arg2, idempotencyKey: arg3 })),
            edit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.editSale>[0], arg2: Parameters<typeof SaleService.editSale>[1], arg3: Parameters<typeof SaleService.editSale>[2]) => withTestMember(arg0, app.db, () => SaleService.editSale(arg1, arg2, arg3)),
            confirmDelivery: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.confirmSaleDelivery>[0], arg2: Parameters<typeof SaleService.confirmSaleDelivery>[1], arg3: Parameters<typeof SaleService.confirmSaleDelivery>[2]) => withTestMember(arg0, app.db, () => SaleService.confirmSaleDelivery(arg1, arg2, arg3)),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.cancelSale>[0], arg2: Parameters<typeof SaleService.cancelSale>[1], arg3: Parameters<typeof SaleService.cancelSale>[2]) => withTestMember(arg0, app.db, () => SaleService.cancelSale(arg1, arg2, arg3))
        }.create(actor, '10000000-0000-4000-8000-000000000001', input, '9ebfd3da-4a78-4201-8123-cb64ee681245')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        await expect({
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, app.db, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
        }.create(actor, '10000000-0000-4000-8000-000000000001', { amountUsd: '1', amountLbp: '0', reason: 'Fuel' }, '9ebfd3da-4a78-4201-8123-cb64ee681245')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        expect(app.repos.sales.create).not.toHaveBeenCalled();
        expect(app.repos.cashOuts.create).not.toHaveBeenCalled();
        expect(app.repos.cashUps.submit).not.toHaveBeenCalled();
        expect(app.repos.cashUps.voidCashUp).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
        expect(record).toEqual(before);
    });
    it('does not reinterpret supported pending changes as approved edits', async () => {
        const app = setup({ fields: ['businessAmountUsd', 'totalCollectedLbp', 'method', 'note'] });
        await expect(app.lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).resolves.toMatchObject({ status: 'SUBMITTED' });
        expect(app.sales[0].businessAmountUsd.toFixed(2)).toBe('10.00');
    });
    it.each([null, 'unknownField'])('rejects unsupported %s pending fields', async (field) => {
        await expect(setup({ fields: [field] }).lifecycle.submit(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'AMENDMENT_FIELD_UNSUPPORTED' });
    });
    it('guards approval and return, while history remains readable', async () => {
        const app = setup({ fields: ['currency'], row: cashUp({ status: 'SUBMITTED' }) });
        const manager = { ...actor, role: 'MANAGER' as const, membershipId: 'manager' };
        await expect(app.lifecycle.approve(manager, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        await expect(app.lifecycle.returnToOpen(manager, '10000000-0000-4000-8000-000000000001', 'Recount')).rejects.toMatchObject({ code: 'LEGACY_AMENDMENT_UNSUPPORTED' });
        expect(app.repos.cashUps.approve).not.toHaveBeenCalled();
        expect(app.repos.cashUps.returnToOpen).not.toHaveBeenCalled();
        expect((await app.query.getOwn(actor, '10000000-0000-4000-8000-000000000001')).status).toBe('SUBMITTED');
    });
});
