import { repositoriesForTest } from './test-support';
import { randomUUID } from "node:crypto";
import { AuditAction, AuditEntityType, Currency, PaymentMethod, SaleStatus } from "../../../src/generated/prisma/enums";
import { DuplicateError, NotFoundError, StaleStateError } from '../../../src/shared/errors/persistence-errors';
import { makeSaleInput, prisma, resetDatabase, seedBusinesses, type Fixtures } from './test-support';
const snapshot = {
    expectedUsd: "10.00",
    expectedLbp: "1000.00",
    countedUsd: "9.00",
    countedLbp: "1100.00",
    gapUsd: "-1.00",
    gapLbp: "100.00",
};
describe("CashUp persistence against PostgreSQL", () => {
    let fixtures: Fixtures;
    beforeEach(async () => {
        await resetDatabase();
        fixtures = await seedBusinesses();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('allocates per-business cash-up numbers atomically and rolls back failed creation', async () => {
        const business = fixtures.businessA;
        const scope = { businessId: business.id };
        const [first, second] = await Promise.all([
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest((scope).businessId, tx);
                return repos.cashUps.open({ membershipId: business.members.staff1.id });
            }, { maxWait: 5000, timeout: 15000 }),
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest((scope).businessId, tx);
                return repos.cashUps.open({ membershipId: business.members.staff2.id });
            }, { maxWait: 5000, timeout: 15000 }),
        ]);
        expect([first.number, second.number].sort()).toEqual([1, 2]);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest((scope).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(DuplicateError);
        expect((await prisma.business.findUniqueOrThrow({ where: { id: business.id } })).lastCashUpNumber).toBe(2);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest((scope).businessId, tx);
            await repos.cashUps.open({ membershipId: business.members.manager.id });
            throw new Error('Rollback after insertion');
        }, { maxWait: 5000, timeout: 15000 })).rejects.toThrow('Rollback after insertion');
        expect((await prisma.business.findUniqueOrThrow({ where: { id: business.id } })).lastCashUpNumber).toBe(2);
        const third = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest((scope).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.manager.id });
        }, { maxWait: 5000, timeout: 15000 });
        expect(third.number).toBe(3);
        const other = fixtures.businessB;
        const independent = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: other.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: other.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        expect(independent.number).toBe(1);
    });
    it('reconciles dual-currency sales, cross-currency change and active cash-outs', async () => {
        const business = fixtures.businessA;
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            const cashUp = await repos.cashUps.open({ membershipId: business.members.staff1.id });
            await repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountUsd: '10',
                businessAmountLbp: '1000',
                totalCollectedUsd: '10',
                totalCollectedLbp: '1000',
                changeGivenLbp: '100'
            }));
            await repos.sales.create(makeSaleInput(cashUp.id, { method: 'WHISH', totalCollectedUsd: '200' }));
            await repos.sales.create(makeSaleInput(cashUp.id, { method: 'OMT', totalCollectedLbp: '5000' }));
            await repos.sales.create(makeSaleInput(cashUp.id, { status: SaleStatus.TO_DELIVER, totalCollectedUsd: '500' }));
            const { cashOut } = await repos.cashOuts.create({ cashUpId: cashUp.id, amountUsd: '99', amountLbp: '99', reason: 'Returned expense' });
            await repos.cashOuts.cancel(cashOut.id, 'Returned expense', business.members.staff1.id);
            await repos.cashOuts.create({ cashUpId: cashUp.id, amountUsd: '2', amountLbp: '200', reason: 'Supplies', note: 'Both currencies' });
            const { buildCashUpSnapshot } = await import('../../../src/modules/cash-ups/cash-ups.workflow');
            const result = await buildCashUpSnapshot(repos.sales, repos.cashOuts, repos.counts, cashUp);
            expect(result).toMatchObject({
                expectedUsd: '8.00',
                expectedLbp: '700.00',
                countedUsd: '0.00',
                countedLbp: '0.00',
                gapUsd: '-8.00',
                gapLbp: '-700.00'
            });
        }, { maxWait: 5000, timeout: 15000 });
    });
    it("isolates cash-ups, sales, cash-outs, counts, and audit rows by tenant", async () => {
        const businessB = fixtures.businessB;
        const cashUpB = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { sale: saleB } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUpB.id));
        }, { maxWait: 5000, timeout: 15000 });
        const { cashOut: cashOutB } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUpB.id,
                amountUsd: "5.00",
                reason: "Test cash-out",
            });
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            await repos.counts.saveLines(cashUpB.id, [
                { currency: Currency.USD, denomination: "10.00", quantity: 2 },
            ]);
            await repos.audit.append({
                actorUserId: businessB.members.owner.userId,
                action: AuditAction.CASHUP_OPENED,
                entityType: AuditEntityType.CASH_UP,
                entityId: cashUpB.id,
            });
        }, { maxWait: 5000, timeout: 15000 });
        const businessA = fixtures.businessA;
        const reposA = repositoriesForTest(({ businessId: businessA.id }).businessId);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff2.id });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        expect(await reposA.cashUps.findById(cashUpB.id)).toBeNull();
        expect(await reposA.sales.findById(saleB.id)).toBeNull();
        expect(await reposA.cashOuts.findById(cashOutB.id)).toBeNull();
        expect(await reposA.cashOuts.listByCashUp(cashUpB.id)).toHaveLength(0);
        expect(await reposA.counts.listByCashUp(cashUpB.id)).toHaveLength(0);
        expect(await reposA.audit.list({ entityId: cashUpB.id })).toHaveLength(0);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.submit(cashUpB.id, snapshot);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUpB.id));
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.sales.edit(saleB.id, { note: "Cross-tenant edit" }, businessA.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUpB.id,
                amountUsd: "1.00",
                reason: "Cross-tenant write",
            });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashOuts.update(cashOutB.id, { reason: "Cross-tenant edit" });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.counts.saveLines(cashUpB.id, [
                { currency: Currency.USD, denomination: "1.00", quantity: 1 },
            ]);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        const tenantAEntry = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.audit.append({
                actorUserId: businessA.members.owner.userId,
                action: AuditAction.CASHUP_OPENED,
                entityType: AuditEntityType.CASH_UP,
                entityId: cashUpB.id,
            });
        }, { maxWait: 5000, timeout: 15000 });
        expect(tenantAEntry.businessId).toBe(businessA.id);
        expect(await repositoriesForTest(({ businessId: businessB.id }).businessId).audit.list({ entityId: cashUpB.id }))
            .toHaveLength(1);
    });
    it("isolates business settings and counts awaiting requests by tenant and cash-up", async () => {
        const businessA = fixtures.businessA;
        const businessB = fixtures.businessB;
        const reposA = repositoriesForTest(({ businessId: businessA.id }).businessId);
        const reposB = repositoriesForTest(({ businessId: businessB.id }).businessId);
        expect(await reposA.businesses.findSettings()).toEqual({
            id: businessA.id,
            name: businessA.name,
            isSolo: false,
        });
        expect(await reposA.businesses.findSettings()).not.toEqual(await reposB.businesses.findSettings());
        const cashUpA = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const cashUpB = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        expect(await reposA.requests.countAwaitingByCashUp(cashUpA.id)).toBe(0);
        await prisma.request.create({
            data: {
                businessId: businessA.id,
                type: "VOID_CASHUP",
                reason: "Awaiting review",
                requestedById: businessA.members.staff1.id,
                cashUpId: cashUpA.id,
            },
        });
        await prisma.request.create({
            data: {
                businessId: businessA.id,
                type: "DELETE_SALE",
                reason: "Completed review",
                requestedById: businessA.members.staff1.id,
                cashUpId: cashUpA.id,
                status: "APPROVED",
            },
        });
        await prisma.request.create({
            data: {
                businessId: businessB.id,
                type: "VOID_CASHUP",
                reason: "Other business",
                requestedById: businessB.members.staff1.id,
                cashUpId: cashUpB.id,
            },
        });
        expect(await reposA.requests.countAwaitingByCashUp(cashUpA.id)).toBe(1);
        expect(await reposA.requests.countAwaitingByCashUp(cashUpB.id)).toBe(0);
        expect(await reposB.requests.countAwaitingByCashUp(cashUpB.id)).toBe(1);
        expect(await reposA.businesses.findSettings()).toEqual({
            id: businessA.id,
            name: businessA.name,
            isSolo: false,
        });
    });
    it("counts every sale status by cash-up within the tenant", async () => {
        const businessA = fixtures.businessA;
        const businessB = fixtures.businessB;
        const cashUpA = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const cashUpB = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const reposA = repositoriesForTest(({ businessId: businessA.id }).businessId);
        const reposB = repositoriesForTest(({ businessId: businessB.id }).businessId);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            await repos.sales.create(makeSaleInput(cashUpA.id));
            await repos.sales.create(makeSaleInput(cashUpA.id, { status: SaleStatus.TO_DELIVER }));
            const { sale } = await repos.sales.create(makeSaleInput(cashUpA.id, { status: SaleStatus.TO_DELIVER }));
            await repos.sales.cancelToDeliver(sale.id, "Customer cancelled");
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUpB.id));
        }, { maxWait: 5000, timeout: 15000 });
        expect(await reposA.sales.countByStatus(cashUpA.id)).toEqual({
            total: 3,
            delivered: 1,
            toDeliver: 1,
            deleted: 1,
        });
        expect(await reposA.sales.countByStatus(cashUpB.id)).toEqual({
            total: 0,
            delivered: 0,
            toDeliver: 0,
            deleted: 0,
        });
        expect(await reposB.sales.countByStatus(cashUpB.id)).toEqual({
            total: 1,
            delivered: 1,
            toDeliver: 0,
            deleted: 0,
        });
    });
    it("rolls back audit entries together with their business change", async () => {
        const business = fixtures.businessA;
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            const cashUp = await repos.cashUps.open({ membershipId: business.members.staff1.id });
            await repos.audit.append({
                actorUserId: business.members.owner.userId,
                action: AuditAction.CASHUP_OPENED,
                entityType: AuditEntityType.CASH_UP,
                entityId: cashUp.id,
            });
            throw new Error("force transaction rollback");
        }, { maxWait: 5000, timeout: 15000 })).rejects.toThrow("force transaction rollback");
        expect(await repositoriesForTest(({ businessId: business.id }).businessId).cashUps.listOpenSummaries()).toHaveLength(0);
        expect(await repositoriesForTest(({ businessId: business.id }).businessId).audit.list()).toHaveLength(0);
    });
    it("guards open, submit, approve, return, void, and concurrent approval transitions", async () => {
        const { businessA, businessB } = fixtures;
        const first = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id, floatUsd: "20.00" });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(DuplicateError);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.submit(first.id, snapshot);
        }, { maxWait: 5000, timeout: 15000 });
        const approved = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.approve(first.id, businessA.members.manager.id, false);
        }, { maxWait: 5000, timeout: 15000 });
        expect(approved.status).toBe("APPROVED");
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.approve(first.id, businessA.members.manager.id, false);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        const returnedCandidate = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.approve(returnedCandidate.id, businessA.members.manager.id, false);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.submit(returnedCandidate.id, snapshot);
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.voidCashUp(returnedCandidate.id, "Not open");
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        const returned = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.returnToOpen(returnedCandidate.id, "Please recount");
        }, { maxWait: 5000, timeout: 15000 });
        expect(returned.status).toBe("OPEN");
        expect(returned.closedAt).toBeNull();
        expect(returned.expectedUsd).toBeNull();
        expect(returned.expectedLbp).toBeNull();
        expect(returned.countedUsd).toBeNull();
        expect(returned.countedLbp).toBeNull();
        expect(returned.gapUsd).toBeNull();
        expect(returned.gapLbp).toBeNull();
        expect(returned.returnReason).toBe("Please recount");
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.voidCashUp(returnedCandidate.id, "Shift cancelled");
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.voidCashUp(returnedCandidate.id, "Already void");
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        const concurrentCashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.submit(concurrentCashUp.id, snapshot);
        }, { maxWait: 5000, timeout: 15000 });
        const decisions = await Promise.allSettled([
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
                return repos.cashUps.approve(concurrentCashUp.id, businessB.members.manager.id, false);
            }, { maxWait: 5000, timeout: 15000 }),
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
                return repos.cashUps.approve(concurrentCashUp.id, businessB.members.owner.id, false);
            }, { maxWait: 5000, timeout: 15000 }),
        ]);
        expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        expect(decisions.filter((result) => result.status === "rejected")).toHaveLength(1);
        const rejected = decisions.find((result) => result.status === "rejected");
        expect(rejected).toBeDefined();
        if (rejected?.status === "rejected") {
            expect(rejected.reason).toBeInstanceOf(StaleStateError);
        }
    });
    it("blocks sale, cash-out, and count writes after approval", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { sale } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id));
        }, { maxWait: 5000, timeout: 15000 });
        const { cashOut } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: "2.00",
                reason: "Before approval",
            });
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.counts.saveLines(cashUp.id, [
                { currency: Currency.USD, denomination: "1.00", quantity: 1 },
            ]);
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.submit(cashUp.id, snapshot);
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.approve(cashUp.id, business.members.manager.id, false);
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id));
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(sale.id, { note: "After approval" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: "1.00",
                reason: "After approval",
            });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.update(cashOut.id, { reason: "After approval" });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.counts.saveLines(cashUp.id, [
                { currency: Currency.USD, denomination: "1.00", quantity: 2 },
            ]);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
    });
    it("allocates gap-free concurrent sale numbers and makes idempotent creates", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const results = await Promise.all(Array.from({ length: 20 }, () => prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id));
        }, { maxWait: 5000, timeout: 15000 })));
        expect(results.map(({ sale }) => sale.saleNumber).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
        const idempotencyKey = randomUUID();
        const firstSale = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, { idempotencyKey }));
        }, { maxWait: 5000, timeout: 15000 });
        const secondSale = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, { idempotencyKey }));
        }, { maxWait: 5000, timeout: 15000 });
        expect(firstSale.created).toBe(true);
        expect(secondSale.created).toBe(false);
        expect(secondSale.sale.id).toBe(firstSale.sale.id);
        expect(await prisma.sale.count({ where: { businessId: business.id, idempotencyKey } })).toBe(1);
        expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).lastSaleNumber)
            .toBe(21);
        const cashOutKey = randomUUID();
        const firstCashOut = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: "4.00",
                reason: "Idempotent",
                idempotencyKey: cashOutKey,
            });
        }, { maxWait: 5000, timeout: 15000 });
        const secondCashOut = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: "4.00",
                reason: "Idempotent",
                idempotencyKey: cashOutKey,
            });
        }, { maxWait: 5000, timeout: 15000 });
        expect(firstCashOut.created).toBe(true);
        expect(secondCashOut.created).toBe(false);
        expect(secondCashOut.cashOut.id).toBe(firstCashOut.cashOut.id);
        expect(await prisma.cashOut.count({ where: { cashUpId: cashUp.id, idempotencyKey: cashOutKey } }))
            .toBe(1);
    });
    it("logs changed sale fields, compares money numerically, and guards sale states", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { sale } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, { status: SaleStatus.TO_DELIVER }));
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(sale.id, { businessAmountUsd: "15.00", note: "Corrected" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 });
        const withEdits = await repositoriesForTest(({ businessId: business.id }).businessId).sales.findByIdWithEdits(sale.id);
        expect(withEdits?.isEdited).toBe(true);
        expect(withEdits?.edits).toHaveLength(2);
        const amountEdit = withEdits?.edits.find((edit) => edit.field === "businessAmountUsd");
        expect(amountEdit?.oldValue).toBe("10.00");
        expect(amountEdit?.newValue).toBe("15.00");
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(sale.id, { businessAmountUsd: "15" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 });
        expect((await repositoriesForTest(({ businessId: business.id }).businessId).sales.findByIdWithEdits(sale.id))?.edits).toHaveLength(2);
        const delivery = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                status: SaleStatus.TO_DELIVER,
                clientNumber: "123",
                totalCollectedUsd: "20.00",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        const delivered = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.markDelivered(delivery.sale.id, { tipUsd: '0.00', tipLbp: '0.00', deliveryFeeUsd: '0.00', deliveryFeeLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenUsd: '0.00',
                changeGivenLbp: '0.00',
                totalCollectedUsd: "22.00",
                method: PaymentMethod.CASH,
                amountDiffers: true,
            });
        }, { maxWait: 5000, timeout: 15000 });
        expect(delivered.status).toBe(SaleStatus.DELIVERED);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.markDelivered(delivery.sale.id, { tipUsd: '0.00', tipLbp: '0.00', deliveryFeeUsd: '0.00', deliveryFeeLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenUsd: '0.00',
                changeGivenLbp: '0.00',
                totalCollectedUsd: "22.00",
                method: PaymentMethod.CASH,
                amountDiffers: false,
            });
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.cancelToDeliver(delivery.sale.id, "Already delivered");
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.lockForDeletion(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toMatchObject({ deletionAwaiting: true });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(delivery.sale.id, { note: "Locked" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.releaseDeletionLock(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.releaseDeletionLock(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.markDeleted(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.lockForDeletion(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 });
        const deleted = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.markDeleted(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 });
        expect(deleted.status).toBe(SaleStatus.DELETED);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.lockForDeletion(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.markDeleted(delivery.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(delivery.sale.id, { note: "Deleted" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        const cancelled = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                status: SaleStatus.TO_DELIVER,
                clientNumber: "456",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.lockForDeletion(cancelled.sale.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.cancelToDeliver(cancelled.sale.id, "Customer cancelled");
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.cancelToDeliver(cancelled.sale.id, "Already cancelled");
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(StaleStateError);
        expect(await repositoriesForTest(({ businessId: business.id }).businessId).sales.list(cashUp.id)).not.toContainEqual(expect.objectContaining({ id: cancelled.sale.id }));
    });
    it("aggregates only delivered sales by currency and method without converting money", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountLbp: '0.00',
                deliveryFeeLbp: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenLbp: '0.00',
                businessAmountUsd: "10.00",
                deliveryFeeUsd: "2.00",
                tipUsd: "1.00",
                totalCollectedUsd: "13.00",
                changeGivenUsd: "2.00",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountLbp: '0.00',
                deliveryFeeLbp: '0.00',
                tipUsd: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedLbp: '0.00',
                changeGivenLbp: '0.00',
                businessAmountUsd: "5.00",
                deliveryFeeUsd: "0.00",
                totalCollectedUsd: "5.00",
                method: PaymentMethod.WHISH,
                changeGivenUsd: "1.00",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                businessAmountUsd: '0.00',
                deliveryFeeUsd: '0.00',
                tipUsd: '0.00',
                tipLbp: '0.00',
                discountUsd: '0.00',
                discountLbp: '0.00',
                totalCollectedUsd: '0.00',
                changeGivenUsd: '0.00',
                businessAmountLbp: "1000000.00",
                deliveryFeeLbp: "50000.00",
                totalCollectedLbp: "1050000.00",
                method: PaymentMethod.WHISH,
                changeGivenLbp: "50000.00",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        const pending = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id, {
                totalCollectedUsd: '0.00',
                changeGivenUsd: '0.00',
                changeGivenLbp: '0.00',
                status: SaleStatus.TO_DELIVER,
                totalCollectedLbp: "700000.00",
                method: PaymentMethod.CASH,
                clientNumber: "789",
            }));
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.cancelToDeliver(pending.sale.id, "Not delivered");
        }, { maxWait: 5000, timeout: 15000 });
        const totals = await repositoriesForTest(({ businessId: business.id }).businessId).sales.totalsByCurrencyAndMethod(cashUp.id);
        expect(totals).toHaveLength(4);
        expect(totals.find((row) => row.currency === Currency.USD && row.method === PaymentMethod.CASH)?.count).toBe(1);
        expect(totals
            .find((row) => row.currency === Currency.USD && row.method === PaymentMethod.CASH)
            ?.totalCollected.toString()).toBe("13");
        expect(totals
            .find((row) => row.currency === Currency.LBP && row.method === PaymentMethod.WHISH)
            ?.totalCollected.toString()).toBe("1050000");
        const changeTotals = await repositoriesForTest(business.id)
            .sales.changeGivenByCurrency(cashUp.id);
        expect(changeTotals.find((row) => row.currency === Currency.USD)?.total.toString()).toBe("3");
        expect(changeTotals.find((row) => row.currency === Currency.LBP)?.total.toString()).toBe("50000");
        expect(await repositoriesForTest(({ businessId: business.id }).businessId).sales.list(cashUp.id)).toHaveLength(3);
    });
    it("upserts count lines, preserves countStartedAt, and keeps currencies separate", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const lines = [
            { currency: Currency.USD, denomination: "20.00", quantity: 1 },
            { currency: Currency.LBP, denomination: "100000.00", quantity: 2 },
        ];
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.counts.saveLines(cashUp.id, lines);
        }, { maxWait: 5000, timeout: 15000 });
        const sentinel = new Date("2020-01-02T03:04:05.000Z");
        await prisma.cashUp.update({
            where: { id: cashUp.id },
            data: { countStartedAt: sentinel },
        });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.counts.saveLines(cashUp.id, [
                { currency: Currency.USD, denomination: "20.00", quantity: 2 },
                { currency: Currency.LBP, denomination: "100000.00", quantity: 3 },
            ]);
        }, { maxWait: 5000, timeout: 15000 });
        expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(2);
        expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).countStartedAt)
            .toEqual(sentinel);
        const totals = await repositoriesForTest(({ businessId: business.id }).businessId).counts.countedTotals(cashUp.id);
        expect(totals.USD.toString()).toBe("40");
        expect(totals.LBP.toString()).toBe("300000");
    });
    it("serializes count saves with a concurrent submit transition", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        let markSubmitted!: () => void;
        let releaseTransition!: () => void;
        const submitted = new Promise<void>((resolve) => {
            markSubmitted = resolve;
        });
        const holdTransition = new Promise<void>((resolve) => {
            releaseTransition = resolve;
        });
        const transition = prisma.$transaction(async (tx) => {
            await tx.cashUp.updateMany({
                where: { id: cashUp.id, businessId: business.id, status: "OPEN" },
                data: { status: "SUBMITTED" },
            });
            markSubmitted();
            await holdTransition;
        });
        await submitted;
        const saving = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.counts.saveLines(cashUp.id, [
                { currency: Currency.USD, denomination: "1.00", quantity: 5 },
            ]);
        }, { maxWait: 5000, timeout: 15000 });
        await new Promise((resolve) => setTimeout(resolve, 50));
        releaseTransition();
        await transition;
        await expect(saving).rejects.toBeInstanceOf(StaleStateError);
        expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(0);
    });
    it("updates cash-outs with before/after values and keeps their totals separate", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { cashOut } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountLbp: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountUsd: "10.00",
                reason: "Initial",
            });
        }, { maxWait: 5000, timeout: 15000 });
        const updated = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.update(cashOut.id, { amountLbp: '0.00', note: null, amountUsd: "12.50", reason: "Updated" });
        }, { maxWait: 5000, timeout: 15000 });
        expect(updated.before.amountUsd.toString()).toBe("10");
        expect(updated.after.amountUsd.toString()).toBe("12.5");
        expect(updated.after.reason).toBe("Updated");
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({
                amountUsd: '0.00',
                note: null,
                cashUpId: cashUp.id,
                amountLbp: "2000.00",
                reason: "LBP expense",
            });
        }, { maxWait: 5000, timeout: 15000 });
        const listed = await repositoriesForTest(({ businessId: business.id }).businessId).cashOuts.listByCashUp(cashUp.id);
        expect(listed.find((row) => row.id === cashOut.id)?.amountUsd.toString()).toBe("12.5");
        expect(listed.find((row) => row.amountLbp.greaterThan(0))?.amountLbp.toString()).toBe("2000");
    });
    it("limits reviewer reads of open cash-ups to non-monetary summaries", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({
                membershipId: business.members.staff1.id,
                floatUsd: "500.00",
                floatLbp: "250000.00",
            });
        }, { maxWait: 5000, timeout: 15000 });
        const repos = repositoriesForTest(({ businessId: business.id }).businessId);
        expect(await repos.cashUps.findForReview(cashUp.id)).toBeNull();
        const [summary] = await repos.cashUps.listOpenSummaries();
        expect(summary.id).toBe(cashUp.id);
        expect(Object.keys(summary).sort()).toEqual(["_count", "id", "membership", "number", "openedAt"]);
    });
    it("enforces database constraints, append-only audit, and Restrict deletes", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const secondOwner = await prisma.user.create({
            data: { email: "business-a-second-owner@example.test", fullName: "Second owner" },
        });
        await expect(prisma.$executeRaw `
        INSERT INTO "memberships" ("id", "userId", "businessId", "role")
        VALUES (${randomUUID()}::uuid, ${secondOwner.id}::uuid, ${business.id}::uuid, 'OWNER')
      `).rejects.toThrow();
        await expect(prisma.$executeRaw `
        INSERT INTO "join_codes" ("id", "businessId", "codeHash", "role", "expiresAt", "maxUses", "createdByUserId")
        VALUES (${randomUUID()}::uuid, ${business.id}::uuid, ${randomUUID()}, 'MANAGER', NOW(), 1, ${business.members.owner.userId}::uuid)
      `).rejects.toThrow();
        await expect(prisma.$executeRaw `
        INSERT INTO "sales" ("id", "businessId", "cashUpId", "saleNumber", "businessAmountUsd", "deliveryFeeUsd", "totalCollectedUsd", "method", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${business.id}::uuid, ${cashUp.id}::uuid, 9001, -1, 0, 0, 'CASH', NOW())
      `).rejects.toThrow();
        await expect(prisma.$executeRaw `
        INSERT INTO "cash_outs" ("id", "cashUpId", "amountUsd", "amountLbp", "reason", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${cashUp.id}::uuid, 0, 0, 'invalid', NOW())
      `).rejects.toThrow();
        await expect(prisma.$executeRaw `
        INSERT INTO "count_entries" ("id", "cashUpId", "currency", "denomination", "quantity", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${cashUp.id}::uuid, 'USD', 1, -1, NOW())
      `).rejects.toThrow();
        const audit = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.audit.append({
                actorUserId: business.members.owner.userId,
                action: AuditAction.CASHUP_OPENED,
                entityType: AuditEntityType.CASH_UP,
                entityId: cashUp.id,
            });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$executeRaw `UPDATE "audit_logs" SET "action" = 'CASHUP_VOIDED' WHERE "id" = ${audit.id}::uuid`).rejects.toThrow();
        await expect(prisma.$executeRaw `DELETE FROM "audit_logs" WHERE "id" = ${audit.id}::uuid`).rejects.toThrow();
        await expect(prisma.$executeRaw `DELETE FROM "businesses" WHERE "id" = ${business.id}::uuid`).rejects.toThrow();
    });
});
