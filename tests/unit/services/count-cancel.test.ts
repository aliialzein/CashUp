import { withTestMember } from '../../support/service-context';
jest.mock('../../../src/modules/audit/audit.service', () => ({ recordAudit: jest.fn() }));
import * as auditFunctions from '../../../src/modules/audit/audit.service';
import { Prisma } from '../../../src/generated/prisma/client';
import type { CashOut, CashUp, CountEntry } from '../../../src/generated/prisma/client';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import { EntityNotFoundError } from '../../../src/shared/errors/service-errors';
import { mockRepositories, testDatabase } from './repository-mocks';
const businessId = '33333333-3333-4333-8333-333333333333';
const membershipId = '22222222-2222-4222-8222-222222222222';
const cashUpId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-03T10:00:00.000Z');
const actor: CurrentMember = {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    membershipId,
    businessId,
    role: 'STAFF',
};
function openCashUp(): CashUp {
    return {
        number: 1,
        id: cashUpId,
        businessId,
        membershipId,
        status: 'OPEN',
        floatUsd: new Prisma.Decimal(0),
        floatLbp: new Prisma.Decimal(0),
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
function countEntry(): CountEntry {
    return {
        id: '148fdf9f-64af-4f61-a707-df61e326cf7d',
        cashUpId,
        currency: 'USD',
        denomination: new Prisma.Decimal('5'),
        quantity: 2,
        updatedAt: now,
    };
}
function cashOut(status: CashOut['status']): CashOut {
    return {
        amountLbp: new Prisma.Decimal('0.00'),
        note: null,
        id: 'a3f1212c-b061-4f82-90c5-e057aa8fd564',
        cashUpId,
        amountUsd: new Prisma.Decimal('2.00'),
        reason: 'Supplies',
        status,
        cancelReason: status === 'CANCELLED' ? 'No longer needed' : null,
        cancelledAt: status === 'CANCELLED' ? now : null,
        cancelledByMembershipId: status === 'CANCELLED' ? membershipId : null,
        idempotencyKey: null,
        createdAt: now,
        updatedAt: now,
    };
}
function setupRepositories() {
    const cashUp = openCashUp();
    const repositories = mockRepositories({
        businesses: {
            findSettings: async () => ({ id: businessId, name: 'Demo', isSolo: false }),
        },
        cashUps: {
            lockForUpdate: async () => cashUp,
            findOwn: async () => cashUp,
        },
        counts: {
            saveLines: async () => [countEntry()],
            countedTotals: async () => ({
                USD: new Prisma.Decimal('10'),
                LBP: new Prisma.Decimal('0'),
            }),
        },
        cashOuts: {
            findById: async () => cashOut('ACTIVE'),
            cancel: async () => cashOut('CANCELLED'),
        },
    });
    const db = testDatabase();
    const audit = { record: jest.mocked(auditFunctions.recordAudit).mockReset().mockResolvedValue(undefined) };
    return { repositories, db, audit };
}
describe('CountService', () => {
    it('rejects count updates when business settings are missing', async () => {
        mockRepositories({ businesses: { findSettings: async () => null } });
        const db = testDatabase();
        const service = {
            getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, db, () => CountService.getOwnCounts(arg1)),
            replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, db, () => CountService.replaceOwnCounts(arg1, arg2))
        };
        await expect(service.replace(actor, cashUpId, { lines: [] })).rejects.toBeInstanceOf(EntityNotFoundError);
    });
    it('replaces a whole count set and returns counted totals', async () => {
        const app = setupRepositories();
        const service = {
            getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, app.db, () => CountService.getOwnCounts(arg1)),
            replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, app.db, () => CountService.replaceOwnCounts(arg1, arg2))
        };
        await expect(service.replace(actor, cashUpId, {
            lines: [{ currency: 'USD', denomination: '5', quantity: 2 }],
        })).resolves.toEqual({
            cashUpId,
            lines: [{ currency: 'USD', denomination: '5.00', quantity: 2 }],
            countedTotals: { USD: '10.00', LBP: '0.00' },
        });
    });
});
describe('CashOutService.cancel', () => {
    it('cancels an active cash-out with the supplied reason', async () => {
        const app = setupRepositories();
        const service = {
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, app.db, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
        };
        await expect(service.cancel(actor, cashUpId, cashOut('ACTIVE').id, 'No longer needed')).resolves.toMatchObject({
            cashOut: { status: 'CANCELLED', cancelReason: 'No longer needed' },
        });
    });
});
describe('Cancellation transaction', () => {
    it('propagates audit failure through the service-owned transaction', async () => {
        const app = setupRepositories();
        const failure = new Error('audit persistence failed');
        jest.mocked(auditFunctions.recordAudit).mockRejectedValueOnce(failure);
        const service = {
            create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, app.db, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
            cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, app.db, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
        };
        await expect(service.cancel(actor, cashUpId, cashOut('ACTIVE').id, 'Reason')).rejects.toBe(failure);
        expect(app.db.$transaction).toHaveBeenCalledTimes(1);
    });
});
