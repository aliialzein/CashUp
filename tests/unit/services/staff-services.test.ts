import { withTestMember } from '../../support/service-context';
jest.mock('../../../src/modules/audit/audit.service', () => ({ recordAudit: jest.fn() }));
import * as auditFunctions from '../../../src/modules/audit/audit.service';
import { Prisma } from '../../../src/generated/prisma/client';
import type { CashOut, CashUp, CountEntry, Membership, Sale } from '../../../src/generated/prisma/client';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import { BusinessRuleError, ConflictError, EntityNotFoundError, ForbiddenError } from '../../../src/shared/errors/service-errors';
import { DuplicateError } from '../../../src/shared/errors/persistence-errors';
import * as SaleService from '../../../src/modules/sales/sales.service';
import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { editSaleSchema } from '../../../src/modules/sales/sales.validation';
import { mockRepositories, testDatabase, type RepositoryMocks } from './repository-mocks';
const businessId = 'c0f049c8-a170-4c72-9177-8767b1ea0904';
const cashUpId = 'b7bc0d14-f58f-4fa2-8432-39d2974d133d';
const saleId = '49536994-7425-4270-a31c-b44fae383c4a';
const membershipId = 'c993b54f-f441-4a56-9d8e-0936ca59ccbc';
const idempotencyKey = '9ebfd3da-4a78-4201-8123-cb64ee681245';
function actor(role: CurrentMember['role'] = 'STAFF', id = membershipId): CurrentMember {
    return {
        userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
        membershipId: id,
        businessId,
        role,
    };
}
function cashUp(status: CashUp['status'] = 'OPEN', ownerId = membershipId): CashUp {
    const now = new Date('2026-11-03T10:00:00.000Z');
    return {
        number: 1,
        id: cashUpId,
        businessId,
        membershipId: ownerId,
        status,
        floatUsd: new Prisma.Decimal('0.00'),
        floatLbp: new Prisma.Decimal('0.00'),
        referenceRate: null,
        openedAt: now,
        countStartedAt: null,
        closedAt: null,
        approvedAt: null,
        voidedAt: null,
        updatedAt: now,
        approvedById: null,
        selfApproved: false,
        returnReason: null,
        voidReason: null,
        lastSaleNumber: 0,
        expectedUsd: null,
        expectedLbp: null,
        countedUsd: null,
        countedLbp: null,
        gapUsd: null,
        gapLbp: null,
    };
}
function sale(status: Sale['status'] = 'DELIVERED', values: Partial<Sale> = {}): Sale {
    const now = new Date('2026-11-03T10:00:00.000Z');
    return {
        id: saleId,
        businessId,
        cashUpId,
        saleNumber: 1,
        status,
        businessAmountUsd: new Prisma.Decimal('10'),
        businessAmountLbp: new Prisma.Decimal('0'),
        deliveryFeeUsd: new Prisma.Decimal('0'),
        deliveryFeeLbp: new Prisma.Decimal('0'),
        tipUsd: new Prisma.Decimal('0'),
        tipLbp: new Prisma.Decimal('0'),
        discountUsd: new Prisma.Decimal('0'),
        discountLbp: new Prisma.Decimal('0'),
        totalCollectedUsd: new Prisma.Decimal('10'),
        totalCollectedLbp: new Prisma.Decimal('0'),
        changeGivenUsd: new Prisma.Decimal('0'),
        changeGivenLbp: new Prisma.Decimal('0'),
        method: 'CASH',
        clientNumber: status === 'TO_DELIVER' ? '+961123456' : null,
        note: null,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,
        cancelReason: null,
        legacyPendingPayment: null,
        idempotencyKey,
        createdAt: now,
        deliveredAt: status === 'DELIVERED' ? now : null,
        deletedAt: null,
        updatedAt: now,
        ...(status === 'TO_DELIVER' ? { tipUsd: null, tipLbp: null, totalCollectedUsd: null, totalCollectedLbp: null, changeGivenUsd: null, changeGivenLbp: null, method: null } : {}),
        ...values,
    };
}
function cashOut(): CashOut {
    const now = new Date('2026-11-03T10:00:00.000Z');
    return {
        amountLbp: new Prisma.Decimal('0.00'),
        note: null,
        id: 'a3f1212c-b061-4f82-90c5-e057aa8fd564',
        cashUpId,
        amountUsd: new Prisma.Decimal('2.00'),
        reason: 'Drawer expense',
        status: 'ACTIVE',
        cancelReason: null,
        cancelledAt: null,
        cancelledByMembershipId: null,
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
    };
}
function countEntry(): CountEntry {
    return {
        id: '148fdf9f-64af-4f61-a707-df61e326cf7d',
        cashUpId,
        currency: 'USD',
        denomination: new Prisma.Decimal('5.00'),
        quantity: 2,
        updatedAt: new Date('2026-11-03T10:00:00.000Z'),
    };
}
function setup(options: {
    status?: CashUp['status'];
    ownerId?: string;
    ownerRole?: CurrentMember['role'];
    ownerMissing?: boolean;
    actorId?: string;
    role?: CurrentMember['role'];
    isSolo?: boolean;
    owned?: boolean;
    saleStatus?: Sale['status'];
    saleValues?: Partial<Sale>;
    saleEditValues?: Partial<Sale>;
    saleCreated?: boolean;
    replayChanges?: boolean;
    cashOutCreated?: boolean;
    cashOutValues?: Partial<CashOut>;
    openConflict?: boolean;
    awaitingDelivery?: number;
    awaitingRequests?: number;
    deletionAwaiting?: number;
} = {}) {
    const currentCashUp = cashUp(options.status, options.ownerId);
    const currentSale = sale(options.saleStatus, options.saleValues);
    const currentCashOut = { ...cashOut(), ...options.cashOutValues };
    let latestCashUp = currentCashUp;
    const ownerMembership: Membership = {
        id: currentCashUp.membershipId,
        userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
        businessId,
        role: options.ownerRole ?? 'STAFF',
        status: 'ACTIVE',
        joinedAt: new Date('2026-11-03T10:00:00.000Z'),
        deactivatedAt: null,
    };
    const audit = { record: jest.mocked(auditFunctions.recordAudit).mockReset().mockResolvedValue(undefined) };
    const repos: RepositoryMocks = mockRepositories({
        businesses: {
            findSettings: async () => ({ id: businessId, name: 'Test shop', isSolo: options.isSolo ?? false }),
        },
        cashUps: {
            open: async () => {
                if (options.openConflict)
                    throw new DuplicateError('Cash-up');
                latestCashUp = cashUp('OPEN', options.actorId ?? membershipId);
                return latestCashUp;
            },
            lockForUpdate: async () => currentCashUp,
            findOwn: async (_id, ownerId) => options.owned === false || ownerId !== currentCashUp.membershipId
                ? null
                : currentCashUp,
            findById: async () => latestCashUp,
            submit: async () => {
                latestCashUp = { ...currentCashUp, status: 'SUBMITTED' };
                return latestCashUp;
            },
            approve: async (_id, approvedById, selfApproved) => {
                latestCashUp = {
                    ...currentCashUp,
                    status: 'APPROVED',
                    approvedById,
                    selfApproved,
                };
                return latestCashUp;
            },
            returnToOpen: async (_id, reason) => {
                latestCashUp = { ...currentCashUp, status: 'OPEN', returnReason: reason };
                return latestCashUp;
            },
        },
        memberships: {
            findById: async () => (options.ownerMissing ? null : ownerMembership),
        },
        sales: {
            hasReplayChanges: async () => options.replayChanges ?? false,
            create: jest.fn(async () => ({
                sale: currentSale,
                created: options.saleCreated ?? true,
            })),
            findById: async () => currentSale,
            countByStatus: jest.fn(async () => ({
                total: 1,
                delivered: currentSale.status === 'DELIVERED' ? 1 : 0,
                toDeliver: currentSale.status === 'TO_DELIVER' ? 1 : 0,
                deleted: currentSale.status === 'DELETED' ? 1 : 0,
            })),
            countAwaitingDelivery: async () => options.awaitingDelivery ?? 0,
            flagCounts: async () => ({
                total: 1,
                deleted: 0,
                edited: 0,
                amountDiffers: 0,
                deletionAwaiting: options.deletionAwaiting ?? 0,
            }),
            totalsByCurrencyAndMethod: async () => [],
            changeGivenByCurrency: async () => [],
            edit: jest.fn(async () => sale(currentSale.status, {
                ...currentSale,
                note: 'Edited note',
                isEdited: true,
                ...options.saleEditValues,
            })),
            markDelivered: jest.fn(async () => sale('DELIVERED', {
                ...currentSale,
                status: 'DELIVERED',
                amountDiffers: true,
                deliveredAt: new Date('2026-11-03T11:00:00.000Z'),
            })),
            cancelToDeliver: jest.fn(async () => sale('DELETED', {
                ...currentSale,
                status: 'DELETED',
                cancelReason: 'Customer cancelled',
                deletedAt: new Date('2026-11-03T11:00:00.000Z'),
            })),
        },
        cashOuts: {
            create: jest.fn(async () => ({
                cashOut: currentCashOut,
                created: options.cashOutCreated ?? true,
            })),
            findById: async () => currentCashOut,
            listByCashUp: async () => [currentCashOut],
            cancel: async () => ({
                ...currentCashOut,
                status: 'CANCELLED',
                cancelReason: 'No longer needed',
                cancelledAt: new Date('2026-11-03T11:00:00.000Z'),
                cancelledByMembershipId: options.actorId ?? membershipId,
            }),
        },
        counts: {
            listByCashUp: async () => [countEntry()],
            saveLines: async () => [countEntry()],
            countedTotals: async () => ({
                USD: new Prisma.Decimal('10.00'),
                LBP: new Prisma.Decimal('0.00'),
            }),
        },
        requests: { countAwaitingByCashUp: async () => options.awaitingRequests ?? 0 },
    });
    const db = testDatabase();
    return {
        repos,
        audit,
        db,
        actor: actor(options.role, options.actorId),
        sale: currentSale,
        cashUp: currentCashUp,
        sales: {
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.createSale>[0], arg2: import("../../../src/modules/sales/sales.validation").CreateSaleInput, arg3: string) => withTestMember(arg0, db, () => SaleService.createSale(arg1, { ...arg2, idempotencyKey: arg3 })),
            edit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.editSale>[0], arg2: Parameters<typeof SaleService.editSale>[1], arg3: Parameters<typeof SaleService.editSale>[2]) => withTestMember(arg0, db, () => SaleService.editSale(arg1, arg2, arg3)),
            confirmDelivery: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.confirmSaleDelivery>[0], arg2: Parameters<typeof SaleService.confirmSaleDelivery>[1], arg3: Parameters<typeof SaleService.confirmSaleDelivery>[2]) => withTestMember(arg0, db, () => SaleService.confirmSaleDelivery(arg1, arg2, arg3)),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.cancelSale>[0], arg2: Parameters<typeof SaleService.cancelSale>[1], arg3: Parameters<typeof SaleService.cancelSale>[2]) => withTestMember(arg0, db, () => SaleService.cancelSale(arg1, arg2, arg3))
        },
        cashOuts: {
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, db, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, db, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
        },
        counts: {
            getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, db, () => CountService.getOwnCounts(arg1)),
            replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, db, () => CountService.replaceOwnCounts(arg1, arg2))
        },
        lifecycle: {
            open: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.openCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.openCashUp(arg1)),
            submit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.submitCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.submitCashUp(arg1)),
            approve: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.approveCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.approveCashUp(arg1)),
            returnToOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[0], arg2: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.returnCashUpToOpen(arg1, arg2)),
            voidOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[0], arg2: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.voidOwnOpenCashUp(arg1, arg2))
        },
    };
}
const createSaleInput = {
    businessAmountLbp: '0.00',
    deliveryFeeLbp: '0.00',
    tipUsd: '0.00',
    tipLbp: '0.00',
    discountUsd: '0.00',
    discountLbp: '0.00',
    totalCollectedLbp: '0.00',
    changeGivenUsd: '0.00',
    changeGivenLbp: '0.00',
    status: 'DELIVERED',
    businessAmountUsd: '10.00',
    deliveryFeeUsd: '0.00',
    totalCollectedUsd: '10.00',
    method: 'CASH',
} as const;
const createCashOutInput = {
    amountLbp: '0.00', note: null,
    amountUsd: '2.00',
    reason: 'Drawer expense',
} as const;
describe('SaleService', () => {
    it('creates a balanced sale and audits the committed change', async () => {
        const app = setup();
        const result = await app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey);
        expect(result).toMatchObject({
            saleId,
            sale: { moneyTaken: 'COLLECTED' },
            salesSummary: { total: 1, delivered: 1 },
            replayed: false,
        });
        expect(app.repos.sales.create).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey, }));
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it('returns an identical create replay without a second audit entry', async () => {
        const app = setup({ saleCreated: false });
        const result = await app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey);
        expect(result.replayed).toBe(true);
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('rejects reusing a create key with different content', async () => {
        const app = setup({ saleCreated: false });
        await expect(app.sales.create(app.actor, cashUpId, { ...createSaleInput, note: 'different request' }, idempotencyKey)).rejects.toBeInstanceOf(ConflictError);
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it.each([
        ['status', { status: 'TO_DELIVER' }],
        ['business amount', { businessAmountUsd: new Prisma.Decimal('11.00') }],
        ['delivery fee', { deliveryFeeUsd: new Prisma.Decimal('1.00') }],
        ['tip', { tipUsd: new Prisma.Decimal('1.00') }],
        ['discount', { discountUsd: new Prisma.Decimal('1.00') }],
        ['total collected', { totalCollectedUsd: new Prisma.Decimal('11.00') }],
        ['LBP business amount', { businessAmountLbp: new Prisma.Decimal('1000') }],
        ['payment method', { method: 'WHISH' }],
        ['change amount', { changeGivenUsd: new Prisma.Decimal('1.00') }],
        ['LBP change', { changeGivenLbp: new Prisma.Decimal('1000') }],
        ['client number', { clientNumber: '+96170000000' }],
        ['note', { note: 'Previously saved' }],
        ['cash-up id', { cashUpId: '4a969bbb-6f7a-4dfb-90cd-c81360c62236' }],
    ] as const)('rejects idempotency replay when the persisted %s differs', async (_field, saleValues) => {
        const app = setup({ saleCreated: false, saleValues });
        await expect(app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(ConflictError);
    });
    it.each(['SUBMITTED', 'APPROVED'] as const)('rejects writes while the cash-up is %s', async (status) => {
        const app = setup({ status });
        await expect(app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(BusinessRuleError);
        expect(app.repos.sales.create).not.toHaveBeenCalled();
    });
    it('rejects invalid sale balances and missing cash-ups without writing', async () => {
        const invalidBalance = setup();
        await expect(invalidBalance.sales.create(invalidBalance.actor, cashUpId, { ...createSaleInput, totalCollectedUsd: '9.00' }, idempotencyKey)).rejects.toBeInstanceOf(BusinessRuleError);
        expect(invalidBalance.repos.sales.create).not.toHaveBeenCalled();
        const missing = setup({ owned: false });
        await expect(missing.sales.create(missing.actor, cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(EntityNotFoundError);
    });
    it('returns 404 for another staff member and reviewers on another staff cash-up', async () => {
        const staff = setup({ owned: false });
        await expect(staff.sales.create(staff.actor, cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(EntityNotFoundError);
        const manager = setup({ role: 'MANAGER', ownerId: membershipId });
        await expect(manager.sales.create(actor('MANAGER', 'c5b51876-8e33-4b48-bdeb-ec803f41b202'), cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(EntityNotFoundError);
    });
    it('allows a Manager on their own cash-up and a solo Owner acting as Staff', async () => {
        const managerMembershipId = 'c5b51876-8e33-4b48-bdeb-ec803f41b202';
        const manager = setup({ role: 'MANAGER', ownerId: managerMembershipId });
        await expect(manager.sales.create(actor('MANAGER', managerMembershipId), cashUpId, createSaleInput, idempotencyKey)).resolves.toMatchObject({ replayed: false });
        const owner = setup({ role: 'OWNER', isSolo: true });
        await expect(owner.sales.create(actor('OWNER'), cashUpId, createSaleInput, idempotencyKey)).resolves.toMatchObject({ replayed: false });
    });
    it('rejects an Owner who is not acting in a solo business', async () => {
        const app = setup({ role: 'OWNER', isSolo: false });
        await expect(app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey)).rejects.toBeInstanceOf(ForbiddenError);
    });
    it('confirms delivery and computes amount-difference flags from the domain', async () => {
        const app = setup({
            saleStatus: 'TO_DELIVER',
            saleValues: { businessAmountUsd: new Prisma.Decimal('12.00') },
        });
        await app.sales.confirmDelivery(app.actor, cashUpId, saleId, { tipUsd: '0.00', tipLbp: '0.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            totalCollectedUsd: '10.00',
            method: 'CASH',
        });
        expect(app.repos.sales.markDelivered).toHaveBeenCalledWith(saleId, expect.objectContaining({ amountDiffers: true, }));
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it.each([['10.00', false], ['11.00', true]] as const)('compares historical CASH orders paid by WHISH financially (%s USD)', async (totalCollectedUsd, amountDiffers) => {
        const app = setup({
            saleStatus: 'TO_DELIVER',
            saleValues: { method: 'CASH', businessAmountUsd: new Prisma.Decimal('10.00') },
        });
        await app.sales.confirmDelivery(app.actor, cashUpId, saleId, {
            tipUsd: '0.00', tipLbp: '0.00', totalCollectedUsd, totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00', changeGivenLbp: '0.00', method: 'WHISH',
        });
        expect(app.repos.sales.markDelivered).toHaveBeenCalledWith(saleId, expect.objectContaining({ method: 'WHISH', amountDiffers }));
    });
    it('rejects delivery confirmation on a collected sale', async () => {
        const app = setup();
        await expect(app.sales.confirmDelivery(app.actor, cashUpId, saleId, { tipUsd: '0.00', tipLbp: '0.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            totalCollectedUsd: '10.00',
            method: 'CASH',
        })).rejects.toBeInstanceOf(BusinessRuleError);
        expect(app.repos.sales.markDelivered).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('rejects a delivered edit with the registered code before any repository mutation or audit', async () => {
        const app = setup();
        await expect(app.sales.edit(app.actor, cashUpId, saleId, { note: 'Rejected' })).rejects.toMatchObject({ name: 'BusinessRuleError', code: 'SALE_ALREADY_DELIVERED' });
        expect(app.repos.sales.edit).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it.each([
        ['DELETED', false, 'SALE_ALREADY_CANCELLED'],
        ['DELIVERED', true, 'CONFLICT'],
        ['TO_DELIVER', true, 'CONFLICT'],
    ] as const)('preserves the prior error for %s with deletion lock %s', async (saleStatus, deletionAwaiting, code) => {
        const app = setup({ saleStatus, saleValues: { deletionAwaiting } });
        await expect(app.sales.edit(app.actor, cashUpId, saleId, { note: 'Rejected' })).rejects.toMatchObject({ name: 'ConflictError', code });
        expect(app.repos.sales.edit).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('rejects delivery completed between the preliminary read and the locked read', async () => {
        const app = setup();
        const delivered = await app.repos.sales.findById(saleId);
        const find = jest.spyOn(SaleRepository.prototype, 'findById').mockResolvedValueOnce({ ...delivered!, status: 'TO_DELIVER' });
        const lock = jest.spyOn(CashUpRepository.prototype, 'lockForUpdate');
        await expect(app.sales.edit(app.actor, cashUpId, saleId, { note: 'Rejected' })).rejects.toMatchObject({ code: 'SALE_ALREADY_DELIVERED' });
        expect(find).toHaveBeenCalledTimes(2);
        expect(lock.mock.invocationCallOrder[0]).toBeLessThan(find.mock.invocationCallOrder[1]);
        expect(app.repos.sales.edit).not.toHaveBeenCalled();
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('edits a partial sale and records an audit only for the change', async () => {
        const app = setup({ saleStatus: 'TO_DELIVER' });
        const result = await app.sales.edit(app.actor, cashUpId, saleId, editSaleSchema.parse({ note: 'Edited note' }));
        expect(result.sale.note).toBe('Edited note');
        expect(app.repos.sales.edit).toHaveBeenCalledWith(saleId, expect.objectContaining({ note: 'Edited note', }), app.actor.membershipId);
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it.each([
        ['business amount', { businessAmountUsd: new Prisma.Decimal('11.00') }],
        ['delivery fee', { deliveryFeeUsd: new Prisma.Decimal('1.00') }],
        ['discount', { discountUsd: new Prisma.Decimal('1.00') }],
        ['LBP business amount', { businessAmountLbp: new Prisma.Decimal('1000') }],
        ['client number', { clientNumber: '+96170000000' }],
        ['note', { note: 'Edited note' }],
    ] as const)('audits a change to the sale %s field', async (_field, saleEditValues) => {
        const app = setup({ saleStatus: 'TO_DELIVER', saleEditValues });
        await app.sales.edit(app.actor, cashUpId, saleId, editSaleSchema.parse({ note: 'Edited note' }));
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it('does not audit a no-op sale edit', async () => {
        const app = setup({ saleStatus: 'TO_DELIVER', saleEditValues: { note: null, isEdited: false } });
        await app.sales.edit(app.actor, cashUpId, saleId, editSaleSchema.parse({ note: 'Edited note' }));
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('cancels a to-deliver sale once and rejects a repeated cancellation', async () => {
        const app = setup({ saleStatus: 'TO_DELIVER' });
        const result = await app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled');
        expect(result.sale.moneyTaken).toBe('CANCELLED');
        expect(app.audit.record).toHaveBeenCalledTimes(1);
        const alreadyCancelled = setup({ saleStatus: 'DELETED' });
        await expect(alreadyCancelled.sales.cancel(alreadyCancelled.actor, cashUpId, saleId, 'Customer cancelled')).rejects.toBeInstanceOf(ConflictError);
        expect(alreadyCancelled.repos.sales.cancelToDeliver).not.toHaveBeenCalled();
        expect(alreadyCancelled.audit.record).not.toHaveBeenCalled();
    });
    it('rejects direct cancellation of a collected sale', async () => {
        const app = setup();
        await expect(app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled')).rejects.toBeInstanceOf(BusinessRuleError);
    });
});
describe('CashOutService', () => {
    it('creates and audits a cash-out with its persistence idempotency key', async () => {
        const app = setup();
        const result = await app.cashOuts.create(app.actor, cashUpId, createCashOutInput, idempotencyKey);
        expect(result).toMatchObject({
            cashOut: { cashUpId, amountUsd: '2.00' },
            replayed: false,
        });
        expect(app.repos.cashOuts.create).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey, cashUpId }));
        expect(app.audit.record).toHaveBeenCalledTimes(1);
    });
    it('does not audit a matching replay and rejects a conflicting reuse', async () => {
        const replay = setup({ cashOutCreated: false });
        await expect(replay.cashOuts.create(replay.actor, cashUpId, createCashOutInput, idempotencyKey)).resolves.toMatchObject({ replayed: true });
        expect(replay.audit.record).not.toHaveBeenCalled();
        const conflict = setup({
            cashOutCreated: false,
            cashOutValues: { reason: 'Different content' },
        });
        await expect(conflict.cashOuts.create(conflict.actor, cashUpId, createCashOutInput, idempotencyKey)).rejects.toBeInstanceOf(ConflictError);
    });
    it('applies the same owner and OPEN-state checks before creating cash-outs', async () => {
        const otherOwner = setup({ owned: false });
        await expect(otherOwner.cashOuts.create(otherOwner.actor, cashUpId, createCashOutInput, idempotencyKey)).rejects.toBeInstanceOf(EntityNotFoundError);
        const submitted = setup({ status: 'SUBMITTED' });
        await expect(submitted.cashOuts.create(submitted.actor, cashUpId, createCashOutInput, idempotencyKey)).rejects.toBeInstanceOf(BusinessRuleError);
        expect(submitted.repos.cashOuts.create).not.toHaveBeenCalled();
    });
});
describe('CashUpLifecycleService review transitions', () => {
    it('maps an existing open cash-up to a conflict', async () => {
        const app = setup({ openConflict: true });
        await expect(app.lifecycle.open(app.actor, { floatUsd: '1.00', floatLbp: '0.00' })).rejects.toBeInstanceOf(ConflictError);
    });
    it('blocks submission while deliveries or decisions are pending', async () => {
        const awaitingDelivery = setup({ awaitingDelivery: 1 });
        await expect(awaitingDelivery.lifecycle.submit(awaitingDelivery.actor, cashUpId)).rejects.toBeInstanceOf(BusinessRuleError);
        const awaitingRequest = setup({ awaitingRequests: 1 });
        await expect(awaitingRequest.lifecycle.submit(awaitingRequest.actor, cashUpId)).rejects.toBeInstanceOf(BusinessRuleError);
        const awaitingDeletion = setup({ deletionAwaiting: 1 });
        await expect(awaitingDeletion.lifecycle.submit(awaitingDeletion.actor, cashUpId)).rejects.toBeInstanceOf(BusinessRuleError);
    });
    it('approves a submitted staff cash-up by its Manager', async () => {
        const app = setup({
            status: 'SUBMITTED',
            role: 'MANAGER',
            actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
            ownerId: membershipId,
        });
        await expect(app.lifecycle.approve(app.actor, cashUpId)).resolves.toMatchObject({
            status: 'APPROVED',
            approvedById: app.actor.membershipId,
            selfApproved: false,
        });
    });
    it('allows a solo Owner to self-approve and rejects a Staff reviewer', async () => {
        const ownerId = 'eeb72ae1-685c-45e8-a3aa-85557d5bc113';
        const soloOwner = setup({
            status: 'SUBMITTED',
            role: 'OWNER',
            actorId: ownerId,
            ownerId,
            ownerRole: 'OWNER',
            isSolo: true,
        });
        await expect(soloOwner.lifecycle.approve(soloOwner.actor, cashUpId)).resolves.toMatchObject({ status: 'APPROVED', selfApproved: true });
        const staff = setup({ status: 'SUBMITTED' });
        await expect(staff.lifecycle.approve(staff.actor, cashUpId)).rejects.toBeInstanceOf(ForbiddenError);
    });
    it('returns a submitted cash-up to OPEN with the review reason', async () => {
        const app = setup({
            status: 'SUBMITTED',
            role: 'MANAGER',
            actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
            ownerId: membershipId,
        });
        await expect(app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount required')).resolves.toMatchObject({ status: 'OPEN', returnReason: 'Recount required' });
    });
    it('rejects review transitions when the owner membership is unavailable', async () => {
        const app = setup({
            status: 'SUBMITTED',
            role: 'MANAGER',
            actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
            ownerId: membershipId,
            ownerMissing: true,
        });
        await expect(app.lifecycle.approve(app.actor, cashUpId)).rejects.toBeInstanceOf(EntityNotFoundError);
        await expect(app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount')).rejects.toBeInstanceOf(EntityNotFoundError);
    });
    it.each([
        ['OPEN', EntityNotFoundError],
        ['APPROVED', ConflictError],
    ] as const)('rejects approval of a %s cash-up', async (status, error) => {
        const app = setup({
            status,
            role: 'MANAGER',
            actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
            ownerId: membershipId,
        });
        await expect(app.lifecycle.approve(app.actor, cashUpId)).rejects.toBeInstanceOf(error);
        await expect(app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount')).rejects.toBeInstanceOf(error);
    });
});
describe('staff mutation role-action-status matrix', () => {
    const managerId = 'c5b51876-8e33-4b48-bdeb-ec803f41b202';
    const ownerId = 'eeb72ae1-685c-45e8-a3aa-85557d5bc113';
    const roles = [
        {
            name: 'staff own',
            role: 'STAFF' as const,
            actorId: membershipId,
            ownerId: membershipId,
            isSolo: false
        },
        {
            name: 'manager own',
            role: 'MANAGER' as const,
            actorId: managerId,
            ownerId: managerId,
            isSolo: false
        },
        {
            name: 'manager on staff',
            role: 'MANAGER' as const,
            actorId: managerId,
            ownerId: membershipId,
            isSolo: false
        },
        {
            name: 'owner non-solo',
            role: 'OWNER' as const,
            actorId: ownerId,
            ownerId: membershipId,
            isSolo: false
        },
        { name: 'owner solo', role: 'OWNER' as const, actorId: ownerId, ownerId, isSolo: true },
    ];
    const actions: Array<{
        name: string;
        saleStatus?: Sale['status'];
        run: (app: ReturnType<typeof setup>) => Promise<unknown>;
    }> = [
        {
            name: 'cash-up open',
            run: (app) => app.lifecycle.open(app.actor, { floatUsd: '1.00', floatLbp: '0.00' }),
        },
        {
            name: 'sale create',
            run: (app) => app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey),
        },
        {
            name: 'sale edit',
            saleStatus: 'TO_DELIVER',
            run: (app) => app.sales.edit(app.actor, cashUpId, saleId, editSaleSchema.parse({ note: 'Changed' })),
        },
        {
            name: 'sale confirm delivery',
            saleStatus: 'TO_DELIVER',
            run: (app) => app.sales.confirmDelivery(app.actor, cashUpId, saleId, { tipUsd: '0.00', tipLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenUsd: '0.00',
                changeGivenLbp: '0.00',
                totalCollectedUsd: '10.00',
                method: 'CASH',
            }),
        },
        {
            name: 'sale cancel',
            saleStatus: 'TO_DELIVER',
            run: (app) => app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled'),
        },
        {
            name: 'cash-out create',
            run: (app) => app.cashOuts.create(app.actor, cashUpId, createCashOutInput, idempotencyKey),
        },
        {
            name: 'cash-out cancel',
            run: (app) => app.cashOuts.cancel(app.actor, cashUpId, cashOut().id, 'No longer needed'),
        },
        {
            name: 'count replace',
            run: (app) => app.counts.replace(app.actor, cashUpId, {
                lines: [{ currency: 'USD', denomination: '5.00', quantity: 2 }],
            }),
        },
        {
            name: 'cash-up submit',
            run: (app) => app.lifecycle.submit(app.actor, cashUpId),
        },
    ];
    it.each(roles.flatMap((role) => actions.flatMap((action) => (['OPEN', 'SUBMITTED', 'APPROVED'] as const).map((status) => ({
        role,
        action,
        status,
    })))))('$role.name / $action.name / $status', async ({ role, action, status }) => {
        const app = setup({
            status,
            role: role.role,
            actorId: role.actorId,
            ownerId: role.ownerId,
            isSolo: role.isSolo,
            saleStatus: action.saleStatus,
        });
        const expected = role.name === 'owner non-solo'
            ? 'ForbiddenError'
            : action.name === 'cash-up open'
                ? 'ALLOW'
                : role.name === 'manager on staff'
                    ? 'EntityNotFoundError'
                    : status === 'OPEN'
                        ? 'ALLOW'
                        : 'BusinessRuleError';
        let actual: string;
        try {
            await action.run(app);
            actual = 'ALLOW';
        }
        catch (error) {
            expect(error).toBeInstanceOf(role.name === 'owner non-solo' ? ForbiddenError : role.name === 'manager on staff' ? EntityNotFoundError : BusinessRuleError);
            actual = error instanceof Error ? error.name : 'UNEXPECTED';
        }
        expect(actual).toBe(expected);
    });
});

describe('operation-only creation command regressions', () => {
    it('rejects malformed UUID keys before opening a transaction', async () => {
        const app = setup();
        await expect(withTestMember(app.actor, app.db, () => SaleService.createSale(cashUpId, { ...createSaleInput, idempotencyKey: 'invalid' }))).rejects.toMatchObject({ name: 'ZodError' });
        expect(app.db.$transaction).not.toHaveBeenCalled();
        expect(app.repos.sales.create).not.toHaveBeenCalled();
    });
    it('rejects malformed money as validation, before a transaction', async () => {
        const app = setup();
        await expect(withTestMember(app.actor, app.db, () => SaleService.createSale(cashUpId, { ...createSaleInput, businessAmountUsd: 'abc', idempotencyKey }))).rejects.toMatchObject({ name: 'ZodError' });
        expect(app.db.$transaction).not.toHaveBeenCalled();
    });
    it.each([false, true])('never treats an edited current sale as the original command (matching current=%s)', async matching => {
        const app = setup({ saleCreated: false, saleValues: { isEdited: true, note: 'edited later' } });
        const input = matching ? { ...createSaleInput, note: 'edited later' } : createSaleInput;
        await expect(withTestMember(app.actor, app.db, () => SaleService.createSale(cashUpId, { ...input, idempotencyKey }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY_UNVERIFIABLE' });
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it('rejects a delivery-mutated replay even when the current columns happen to match', async () => {
        const app = setup({ saleCreated: false, replayChanges: true });
        await expect(withTestMember(app.actor, app.db, () => SaleService.createSale(cashUpId, { ...createSaleInput, idempotencyKey }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY_UNVERIFIABLE' });
        expect(app.audit.record).not.toHaveBeenCalled();
    });
    it.each(['SUBMITTED', 'APPROVED'] as const)('preserves the closed cash-up replay restriction for %s', async status => {
        const app = setup({ saleCreated: false, status });
        await expect(withTestMember(app.actor, app.db, () => SaleService.createSale(cashUpId, { ...createSaleInput, idempotencyKey }))).rejects.toMatchObject({ code: 'CASHUP_NOT_OPEN' });
        expect(app.repos.sales.create).not.toHaveBeenCalled();
    });
});
