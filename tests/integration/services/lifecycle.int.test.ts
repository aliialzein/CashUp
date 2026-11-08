import { withTestMember } from '../../support/service-context';
import { prepareForSubmission } from './service-test-support';
import { repositoriesForTest } from '../persistence/test-support';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { Prisma } from '../../../src/generated/prisma/client';
import { AuditAction, Currency, PaymentMethod, SaleStatus } from '../../../src/generated/prisma/enums';
import { StaleStateError } from '../../../src/shared/errors/persistence-errors';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { ForbiddenError } from '../../../src/shared/errors/service-errors';
import { makeSaleInput } from '../persistence/test-support';
import { managerActor, openEmptyCashUp, ownerActor, prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';
type Deferred = {
    promise: Promise<void>;
    resolve: () => void;
};
function deferred(): Deferred {
    let resolvePromise: (() => void) | undefined;
    const promise = new Promise<void>((finish) => {
        resolvePromise = finish;
    });
    return {
        promise,
        resolve: () => {
            if (!resolvePromise)
                throw new Error('Deferred promise is not initialized.');
            resolvePromise();
        },
    };
}
async function waitForCashUpLockWaits(expected: number): Promise<void> {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
        const [{ waiting }] = await prisma.$queryRaw<Array<{
            waiting: number;
        }>>(Prisma.sql `
      SELECT COUNT(*)::int AS waiting
      FROM pg_stat_activity
      WHERE wait_event_type = 'Lock'
        AND query ILIKE ${'%FROM "cash_ups"%'}
        AND query ILIKE ${'%FOR UPDATE%'}
    `);
        if (waiting >= expected)
            return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out waiting for ${expected} cash-up lock waiter(s).`);
}
async function holdCashUpLock(businessId: string, cashUpId: string) {
    const acquired = deferred();
    const release = deferred();
    const holder = prisma.$transaction(async (tx) => {
        const repos = repositoriesForTest(({ businessId }).businessId, tx);
        await repos.cashUps.lockForUpdate(cashUpId);
        acquired.resolve();
        await release.promise;
    }, { maxWait: 5000, timeout: 15000 });
    await acquired.promise;
    return { holder, release };
}
describe('cash-up lifecycle services', () => {
    jest.setTimeout(60000);
    beforeEach(async () => {
        await resetDatabase();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('enforces opening permissions, records audit, and rolls back when audit fails', async () => {
        const fixtures = await seedBusinesses();
        const business = fixtures.businessA;
        const staff = await staffActor(business);
        const opened = await services.lifecycle.open(staff, { floatUsd: '10.00' });
        expect(opened.status).toBe('OPEN');
        await expect(services.lifecycle.open(staff, {})).rejects.toMatchObject({
            code: 'CASHUP_ALREADY_OPEN',
        });
        await expect(services.lifecycle.open(await ownerActor(business), {})).rejects.toBeInstanceOf(ForbiddenError);
        const auditRows = await repositoriesForTest(({ businessId: business.id }).businessId).audit.list({
            entityId: opened.id,
        });
        expect(auditRows).toHaveLength(1);
        expect(auditRows[0]).toMatchObject({ actorId: staff.userId, action: AuditAction.CASHUP_OPENED });
        jest.spyOn(AuditRepository.prototype, 'append').mockRejectedValue(new Error('injected audit failure'));
        const failingServices = { lifecycle: {
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
        const secondStaff = await staffActor(business, 2);
        await expect(failingServices.lifecycle.open(secondStaff, {})).rejects.toThrow('injected audit failure');
        expect(await repositoriesForTest(({ businessId: business.id }).businessId).cashUps.findOpenByMembership(secondStaff.membershipId)).toBeNull();
        jest.restoreAllMocks();
        const soloOwner = await ownerActor(fixtures.soloBusiness);
        await expect(services.lifecycle.open(soloOwner, {})).resolves.toMatchObject({
            status: 'OPEN',
        });
    });
    it('blocks submission for undelivered sales, awaiting requests, and pending deletion', async () => {
        const fixtures = await seedBusinesses();
        const business = fixtures.businessA;
        const firstActor = await staffActor(business);
        const deliveryCashUp = await openEmptyCashUp(business, firstActor);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(deliveryCashUp.id, { status: SaleStatus.TO_DELIVER }));
        }, { maxWait: 5000, timeout: 15000 });
        await expect(services.lifecycle.submit(firstActor, deliveryCashUp.id)).rejects.toMatchObject({ code: 'SALES_AWAITING_DELIVERY' });
        const secondActor = await staffActor(business, 2);
        const requestCashUp = await openEmptyCashUp(business, secondActor);
        await prisma.request.create({
            data: {
                businessId: business.id,
                type: 'VOID_CASHUP',
                reason: 'Awaiting decision',
                requestedById: secondActor.membershipId,
                cashUpId: requestCashUp.id,
            },
        });
        await expect(services.lifecycle.submit(secondActor, requestCashUp.id)).rejects.toMatchObject({ code: 'REQUESTS_AWAITING_DECISION' });
        const manager = await managerActor(business);
        const deletionCashUp = await openEmptyCashUp(business, manager);
        const { sale } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(deletionCashUp.id));
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.sale.update({ where: { id: sale.id }, data: { deletionAwaiting: true } });
        await expect(services.lifecycle.submit(manager, deletionCashUp.id)).rejects.toMatchObject({ code: 'REQUESTS_AWAITING_DECISION' });
    });
    it('submits a server-computed mixed-currency snapshot and audits its gaps', async () => {
        const fixtures = await seedBusinesses();
        const business = fixtures.businessA;
        const staff = await staffActor(business);
        const cashUp = await services.lifecycle.open(staff, {
            floatUsd: '10.00',
            floatLbp: '1000.00',
        });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            await repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountLbp: '0.00',
                deliveryFeeUsd: '0.00',
                deliveryFeeLbp: '0.00',
                tipUsd: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenLbp: '0.00',
                businessAmountUsd: '30.00',
                totalCollectedUsd: '32.00',
                changeGivenUsd: '2.00',
            }));
            await repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountLbp: '0.00',
                deliveryFeeUsd: '0.00',
                deliveryFeeLbp: '0.00',
                tipUsd: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenUsd: '0.00',
                changeGivenLbp: '0.00',
                businessAmountUsd: '100.00',
                totalCollectedUsd: '100.00',
                method: PaymentMethod.WHISH,
            }));
            await repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountUsd: '0.00',
                deliveryFeeUsd: '0.00',
                deliveryFeeLbp: '0.00',
                tipUsd: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedUsd: '0.00',
                changeGivenUsd: '0.00',
                businessAmountLbp: '10000.00',
                totalCollectedLbp: '10000.00',
                changeGivenLbp: '1000.00',
            }));
            await repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: '5.00',
                reason: 'USD expense',
            });
            await repos.cashOuts.create({
                amountUsd: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountLbp: '1000.00',
                reason: 'LBP expense',
            });
            await repos.counts.saveLines(cashUp.id, [
                { currency: Currency.USD, denomination: '20.00', quantity: 1 },
                { currency: Currency.USD, denomination: '10.00', quantity: 1 },
                { currency: Currency.USD, denomination: '5.00', quantity: 1 },
                { currency: Currency.LBP, denomination: '5000.00', quantity: 1 },
                { currency: Currency.LBP, denomination: '2000.00', quantity: 2 },
            ]);
        }, { maxWait: 5000, timeout: 15000 });
        await prepareForSubmission(staff, cashUp.id);
        const submitted = await services.lifecycle.submit(staff, cashUp.id);
        expect(submitted).toMatchObject({
            status: 'SUBMITTED',
            expectedUsd: '35.00',
            expectedLbp: '9000.00',
            countedUsd: '35.00',
            countedLbp: '9000.00',
            gapUsd: '0.00',
            gapLbp: '0.00',
        });
        const auditRows = await repositoriesForTest(({ businessId: business.id }).businessId).audit.list({
            entityId: cashUp.id,
        });
        expect(auditRows.find(({ action }) => action === AuditAction.CASHUP_SUBMITTED)).toMatchObject({
            action: AuditAction.CASHUP_SUBMITTED,
            metadata: { gapUsd: '0.00', gapLbp: '0.00' },
        });
    });
    it('applies reviewer policy, return behavior, solo self-approval, and tenant hiding', async () => {
        const fixtures = await seedBusinesses();
        const business = fixtures.businessA;
        const staff = await staffActor(business);
        const manager = await managerActor(business);
        const owner = await ownerActor(business);
        const approveTarget = await openEmptyCashUp(business, staff);
        await prepareForSubmission(staff, approveTarget.id);
        await services.lifecycle.submit(staff, approveTarget.id);
        await expect(services.lifecycle.approve(staff, approveTarget.id)).rejects.toBeInstanceOf(ForbiddenError);
        await expect(services.lifecycle.approve(manager, approveTarget.id)).resolves.toMatchObject({
            status: 'APPROVED',
            approvedById: manager.membershipId,
            selfApproved: false,
        });
        const returnTarget = await openEmptyCashUp(business, await staffActor(business, 2));
        const secondStaff = await staffActor(business, 2);
        await prepareForSubmission(secondStaff, returnTarget.id);
        await services.lifecycle.submit(secondStaff, returnTarget.id);
        await expect(services.lifecycle.returnToOpen(manager, returnTarget.id, 'Recount required')).resolves.toMatchObject({ status: 'OPEN', returnReason: 'Recount required' });
        const managerCashUp = await openEmptyCashUp(business, manager);
        await prepareForSubmission(manager, managerCashUp.id);
        await services.lifecycle.submit(manager, managerCashUp.id);
        await expect(services.lifecycle.approve(manager, managerCashUp.id)).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
        await expect(services.lifecycle.approve(owner, managerCashUp.id)).resolves.toMatchObject({
            status: 'APPROVED',
        });
        const soloOwner = await ownerActor(fixtures.soloBusiness);
        const soloCashUp = await openEmptyCashUp(fixtures.soloBusiness, soloOwner);
        await prepareForSubmission(soloOwner, soloCashUp.id);
        await services.lifecycle.submit(soloOwner, soloCashUp.id);
        await expect(services.lifecycle.approve(soloOwner, soloCashUp.id)).resolves.toMatchObject({
            status: 'APPROVED',
            selfApproved: true,
        });
        const foreign = await openEmptyCashUp(fixtures.businessB, await staffActor(fixtures.businessB));
        await expect(services.queries.getReviewDetail(owner, foreign.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
        await expect(services.lifecycle.approve(owner, foreign.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    });
    it('serializes approve versus return and submit versus sale edit for five iterations', async () => {
        const fixtures = await seedBusinesses();
        const business = fixtures.businessA;
        const staff = await staffActor(business);
        const manager = await managerActor(business);
        for (let iteration = 0; iteration < 5; iteration += 1) {
            const candidate = await openEmptyCashUp(business, staff);
            await prepareForSubmission(staff, candidate.id);
            await services.lifecycle.submit(staff, candidate.id);
            const lock = await holdCashUpLock(business.id, candidate.id);
            const approval = services.lifecycle.approve(manager, candidate.id);
            await waitForCashUpLockWaits(1);
            const returnRequest = services.lifecycle.returnToOpen(manager, candidate.id, `Return race ${iteration}`);
            try {
                await waitForCashUpLockWaits(2);
            }
            finally {
                lock.release.resolve();
            }
            await expect(approval).resolves.toMatchObject({ status: 'APPROVED' });
            await expect(returnRequest).rejects.toMatchObject({ code: 'CASHUP_STATE_CONFLICT' });
            await lock.holder;
        }
        for (let iteration = 0; iteration < 5; iteration += 1) {
            const candidate = await openEmptyCashUp(business, staff);
            const { sale } = await prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.sales.create(makeSaleInput(candidate.id));
            }, { maxWait: 5000, timeout: 15000 });
            await prepareForSubmission(staff, candidate.id);
            const lock = await holdCashUpLock(business.id, candidate.id);
            const submission = services.lifecycle.submit(staff, candidate.id);
            await waitForCashUpLockWaits(1);
            const edit = prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.sales.edit(sale.id, { note: `late edit ${randomUUID()}` }, staff.membershipId);
            }, { maxWait: 5000, timeout: 15000 });
            try {
                await waitForCashUpLockWaits(2);
            }
            finally {
                lock.release.resolve();
            }
            await expect(submission).resolves.toMatchObject({ status: 'SUBMITTED' });
            await expect(edit).rejects.toBeInstanceOf(StaleStateError);
            await lock.holder;
        }
    });
});
