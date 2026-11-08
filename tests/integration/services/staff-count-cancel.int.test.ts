import { withTestMember } from '../../support/service-context';
import { prepareForSubmission } from './service-test-support';
import { jest } from '@jest/globals';
import { repositoriesForTest } from '../persistence/test-support';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import { randomUUID } from 'node:crypto';
import { AuditAction } from '../../../src/generated/prisma/enums';
import { NotInTransactionError } from '../../../src/shared/errors/persistence-errors';
import { buildSubmitSnapshot } from '../../../src/domain/money/cash-up-totals';
import { saveCountLinesSchema } from '../../../src/modules/cash-ups/cash-ups.validation';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { managerActor, prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';
async function setup() {
    const { businessA: business, businessB } = await seedBusinesses();
    const actor = await staffActor(business);
    const cashUp = await services.lifecycle.open(actor, { floatUsd: '20.00' });
    const { cashOut } = await services.cashOuts.create(actor, cashUp.id, {
        amountLbp: '0.00', note: null,
        amountUsd: '7.00', reason: 'Supplies',
    }, randomUUID());
    return { business, businessB, actor, cashUp, cashOut };
}
// Fail a real audit INSERT after a valid one, proving both audit and mutation roll back.
describe('Staff count replacement and cash-out cancellation', () => {
    beforeEach(resetDatabase);
    afterAll(async () => { await prisma.$disconnect(); });
    it('replaces counts, zeroes omitted lines, and excludes cancelled cash-outs from snapshots and review totals', async () => {
        const { business, actor, cashUp, cashOut } = await setup();
        await services.cashOuts.create(actor, cashUp.id, {
            amountLbp: '0.00', note: null,
            amountUsd: '3.00', reason: 'Active expense',
        }, randomUUID());
        await services.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({
            lines: [
                { currency: 'USD', denomination: '10', quantity: 2 },
                { currency: 'USD', denomination: '5', quantity: 1 },
                { currency: 'LBP', denomination: '1000', quantity: 1 },
            ]
        }));
        const replaced = await services.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({
            lines: [
                { currency: 'USD', denomination: '10', quantity: 1 },
                { currency: 'USD', denomination: '1', quantity: 7 },
            ]
        }));
        expect(replaced.countedTotals).toEqual({ USD: '17.00', LBP: '0.00' });
        expect(replaced.lines).toEqual(expect.arrayContaining([
            { currency: 'USD', denomination: '5.00', quantity: 0 },
            { currency: 'LBP', denomination: '1000.00', quantity: 0 },
            { currency: 'USD', denomination: '10.00', quantity: 1 },
        ]));
        const cancelled = await services.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Not needed');
        expect(cancelled.cashOut).toMatchObject({ status: 'CANCELLED', cancelReason: 'Not needed' });
        expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toMatchObject({
            cancelledByMembershipId: actor.membershipId, cancelledAt: expect.any(Date),
        });
        const expected = buildSubmitSnapshot({
            floatUsd: '20.00',
            floatLbp: '0.00',
            sales: [],
            change: [],
            cashOuts: [
                { currency: 'USD', total: '7.00', status: 'CANCELLED' },
                { currency: 'USD', total: '3.00', status: 'ACTIVE' },
            ],
            counted: { USD: '17.00', LBP: '0.00' },
        });
        expect(expected).toEqual({
            expectedUsd: '17.00',
            expectedLbp: '0.00',
            countedUsd: '17.00',
            countedLbp: '0.00',
            gapUsd: '0.00',
            gapLbp: '0.00'
        });
        await prepareForSubmission(actor, cashUp.id);
        expect(await services.lifecycle.submit(actor, cashUp.id)).toMatchObject({ status: 'SUBMITTED', ...expected });
        const review = await services.queries.getReviewDetail(await managerActor(business), cashUp.id);
        expect(review.expectedAndGap.USD).toMatchObject({ expected: '17.00', counted: '17.00', gap: '0.00' });
        const audit = await repositoriesForTest(({ businessId: business.id }).businessId).audit.list({ entityId: cashOut.id });
        expect(audit.filter(row => row.action === AuditAction.CASHOUT_CANCELLED)).toEqual([
            expect.objectContaining({ actorId: actor.userId, metadata: { reason: 'Not needed' } }),
        ]);
        const countAudit = await repositoriesForTest(({ businessId: business.id }).businessId).audit.list({ entityId: cashUp.id });
        expect(countAudit.filter(row => row.action === AuditAction.COUNT_UPDATED)).toHaveLength(2);
    });
    it('allows only one concurrent cancellation and preserves the winning reason and audit', async () => {
        const { business, actor, cashUp, cashOut } = await setup();
        const results = await Promise.allSettled(['First', 'Second'].map(reason => services.cashOuts.cancel(actor, cashUp.id, cashOut.id, reason)));
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter(result => result.status === 'rejected')).toEqual([
            expect.objectContaining({ reason: expect.objectContaining({ code: 'CONFLICT' }) }),
        ]);
        const row = await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } });
        const audits = await repositoriesForTest(({ businessId: business.id }).businessId).audit.list({ entityId: cashOut.id });
        expect(audits.filter(entry => entry.action === AuditAction.CASHOUT_CANCELLED)).toEqual([
            expect.objectContaining({ metadata: { reason: row.cancelReason } }),
        ]);
        await expect(services.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Again')).rejects.toMatchObject({ code: 'CONFLICT' });
        expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toEqual(row);
    });
    it('requires a transaction and preserves missing-record, ownership, and tenant hiding', async () => {
        const { business, businessB, actor, cashUp, cashOut } = await setup();
        await expect(repositoriesForTest(({ businessId: business.id }).businessId).cashOuts.cancel(cashOut.id, 'Outside', actor.membershipId))
            .rejects.toBeInstanceOf(NotInTransactionError);
        for (const other of [await staffActor(business, 2), await staffActor(businessB)]) {
            await expect(services.cashOuts.cancel(other, cashUp.id, cashOut.id, 'Hidden'))
                .rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        }
        await expect(services.cashOuts.cancel(actor, cashUp.id, randomUUID(), 'Missing'))
            .rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    });
    it('rolls back cancellation, count replacement, and audit inserts when audit persistence fails', async () => {
        const { actor, cashUp, cashOut } = await setup();
        const failing = { lifecycle: {
                open: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.openCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.openCashUp(arg1)),
                submit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.submitCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.submitCashUp(arg1)),
                approve: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.approveCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.approveCashUp(arg1)),
                returnToOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[0], arg2: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[1]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.returnCashUpToOpen(arg1, arg2)),
                voidOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[0], arg2: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[1]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.voidOwnOpenCashUp(arg1, arg2))
            }, cashOuts: {
                create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, prisma, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
                cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, prisma, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
            }, counts: {
                getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, prisma, () => CountService.getOwnCounts(arg1)),
                replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, prisma, () => CountService.replaceOwnCounts(arg1, arg2))
            } };
        const before = await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } });
        const auditBefore = await prisma.auditLog.count();
        jest.spyOn(AuditRepository.prototype, 'append').mockRejectedValue(new Error('injected audit failure'));
        await expect(failing.cashOuts.cancel(actor, cashUp.id, cashOut.id, 'Rollback')).rejects.toThrow();
        expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toEqual(before);
        await expect(failing.counts.replace(actor, cashUp.id, saveCountLinesSchema.parse({
            lines: [
                { currency: 'USD', denomination: '10', quantity: 1 },
            ]
        }))).rejects.toThrow();
        expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(0);
        expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).countStartedAt).toBeNull();
        expect(await prisma.auditLog.count()).toBe(auditBefore);
    });
});
