import { repositoriesForTest } from './test-support';
import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import { Prisma } from "../../../src/generated/prisma/client";
import { CashUpStatus, Currency, PaymentMethod, SaleStatus } from "../../../src/generated/prisma/enums";
import { NotFoundError, NotInTransactionError, StaleStateError } from '../../../src/shared/errors/persistence-errors';
import type { Repositories } from './test-support';
import { buildSubmitSnapshot } from '../../../src/domain/money/cash-up-totals';
import { makeSaleInput, prisma, resetDatabase, seedBusinesses, type BusinessFixture, type Fixtures } from './test-support';
type Deferred = {
    promise: Promise<void>;
    resolve: () => void;
};
function deferred(): Deferred {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}
async function waitForCashUpLockWait(): Promise<void> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        const [{ waiting }] = await prisma.$queryRaw<Array<{
            waiting: boolean;
        }>>(Prisma.sql `
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND query ILIKE ${'%FROM "cash_ups"%'}
          AND query ILIKE ${'%FOR UPDATE%'}
      ) AS waiting
    `);
        if (waiting)
            return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Timed out waiting for a transaction to block on the cash-up row lock.");
}
async function snapshotForSubmit(repos: Repositories, cashUpId: string): Promise<{
    expectedUsd: string;
    expectedLbp: string;
    countedUsd: string;
    countedLbp: string;
    gapUsd: string;
    gapLbp: string;
}> {
    const [sales, changes, cashOuts, counts] = await Promise.all([
        repos.sales.totalsByCurrencyAndMethod(cashUpId),
        repos.sales.changeGivenByCurrency(cashUpId),
        repos.cashOuts.listByCashUp(cashUpId),
        repos.counts.countedTotals(cashUpId),
    ]);
    return buildSubmitSnapshot({
        floatUsd: '0',
        floatLbp: '0',
        sales,
        change: changes,
        cashOuts: cashOuts.flatMap(({ amountUsd, amountLbp, status }) => [{ currency: 'USD', total: amountUsd.toString(), status }, { currency: 'LBP', total: amountLbp.toString(), status }]),
        counted: {
            USD: counts.USD.toString(),
            LBP: counts.LBP.toString(),
        },
    });
}
async function runSubmitAgainstWrite(business: BusinessFixture, cashUpId: string, write: (repos: Repositories) => Promise<unknown>): Promise<Awaited<ReturnType<typeof snapshotForSubmit>>> {
    const acquired = deferred();
    const release = deferred();
    const submission = prisma.$transaction(async (tx) => {
        const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
        await repos.cashUps.lockForUpdate(cashUpId);
        const snapshot = await snapshotForSubmit(repos, cashUpId);
        acquired.resolve();
        await release.promise;
        const submitted = await repos.cashUps.submit(cashUpId, snapshot);
        return { submitted, snapshot };
    }, { maxWait: 5000, timeout: 15000 });
    await acquired.promise;
    const writing = prisma.$transaction(async (tx) => {
        const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
        return write(repos);
    }, { maxWait: 5000, timeout: 15000 });
    try {
        await waitForCashUpLockWait();
    }
    finally {
        release.resolve();
    }
    const { submitted, snapshot } = await submission;
    expect(submitted.status).toBe(CashUpStatus.SUBMITTED);
    await expect(writing).rejects.toBeInstanceOf(StaleStateError);
    return snapshot;
}
describe("cash-up write serialization", () => {
    jest.setTimeout(20000);
    let fixtures: Fixtures;
    beforeEach(async () => {
        await resetDatabase();
        fixtures = await seedBusinesses();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it.each([
        "sales.edit",
        "sales.create",
        "cashOuts.create",
        "cashOuts.update",
        "cashOuts.cancel",
        "counts.saveLines",
        "sales.markDelivered",
        "sales.cancelToDeliver",
    ])("%s waits for submit and is rejected after its commit", async (operation) => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        let saleId: string | undefined;
        let cashOutId: string | undefined;
        if (operation === "sales.edit") {
            saleId = (await prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.sales.create(makeSaleInput(cashUp.id));
            }, { maxWait: 5000, timeout: 15000 })).sale.id;
        }
        else if (operation === "cashOuts.update" || operation === "cashOuts.cancel") {
            cashOutId = (await prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.cashOuts.create({
                    amountLbp: '0.00',
                    note: null,
                    cashUpId: cashUp.id,
                    amountUsd: "3.00",
                    reason: "Before submit",
                });
            }, { maxWait: 5000, timeout: 15000 })).cashOut.id;
        }
        else if (operation === "counts.saveLines") {
            await prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.counts.saveLines(cashUp.id, [
                    { currency: Currency.USD, denomination: "10.00", quantity: 1 },
                ]);
            }, { maxWait: 5000, timeout: 15000 });
        }
        else if (operation === "sales.markDelivered" || operation === "sales.cancelToDeliver") {
            saleId = (await prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
                return repos.sales.create(makeSaleInput(cashUp.id, {
                    status: SaleStatus.TO_DELIVER,
                    clientNumber: `client-${operation}`,
                }));
            }, { maxWait: 5000, timeout: 15000 })).sale.id;
        }
        const salesBefore = await prisma.sale.findMany({ where: { cashUpId: cashUp.id } });
        const saleEditsBefore = await prisma.saleEdit.count({
            where: { sale: { cashUpId: cashUp.id } },
        });
        const cashOutsBefore = await prisma.cashOut.findMany({ where: { cashUpId: cashUp.id } });
        const countsBefore = await prisma.countEntry.findMany({ where: { cashUpId: cashUp.id } });
        const write = async (repos: Repositories): Promise<unknown> => {
            switch (operation) {
                case "sales.edit":
                    return repos.sales.edit(saleId!, { note: "Must not land after submit" }, business.members.staff1.id);
                case "sales.create":
                    return repos.sales.create(makeSaleInput(cashUp.id));
                case "cashOuts.create":
                    return repos.cashOuts.create({
                        amountLbp: '0.00',
                        note: null,
                        cashUpId: cashUp.id,
                        amountUsd: "2.00",
                        reason: "Must not land after submit",
                    });
                case "cashOuts.cancel":
                    return repos.cashOuts.cancel(cashOutId!, "Cancelled during submit", business.members.staff1.id);
                case "cashOuts.update":
                    return repos.cashOuts.update(cashOutId!, { reason: "Must not land after submit" });
                case "counts.saveLines":
                    return repos.counts.saveLines(cashUp.id, [
                        { currency: Currency.USD, denomination: "10.00", quantity: 9 },
                    ]);
                case "sales.markDelivered":
                    return repos.sales.markDelivered(saleId!, {
                        totalCollectedLbp: '0.00',
                        changeGivenUsd: '0.00',
                        changeGivenLbp: '0.00',
                        totalCollectedUsd: "11.00",
                        method: PaymentMethod.CASH,
                        amountDiffers: true,
                    });
                case "sales.cancelToDeliver":
                    return repos.sales.cancelToDeliver(saleId!, "Must not cancel after submit");
            }
        };
        const snapshot = await runSubmitAgainstWrite(business, cashUp.id, write);
        expect(await prisma.sale.findMany({ where: { cashUpId: cashUp.id } })).toEqual(salesBefore);
        expect(await prisma.saleEdit.count({ where: { sale: { cashUpId: cashUp.id } } })).toBe(saleEditsBefore);
        expect(await prisma.cashOut.findMany({ where: { cashUpId: cashUp.id } })).toEqual(cashOutsBefore);
        expect(await prisma.countEntry.findMany({ where: { cashUpId: cashUp.id } })).toEqual(countsBefore);
        const finalCashUp = await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } });
        expect(finalCashUp.expectedUsd?.toFixed(2)).toBe(snapshot.expectedUsd);
    });
    it("rereads cancellation state after waiting for the parent lock", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { cashOut } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({ amountLbp: '0.00', note: null, cashUpId: cashUp.id, amountUsd: '3.00', reason: 'Expense' });
        }, { maxWait: 5000, timeout: 15000 });
        const acquired = deferred();
        const release = deferred();
        const first = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            const result = await repos.cashOuts.cancel(cashOut.id, 'First', business.members.staff1.id);
            acquired.resolve();
            await release.promise;
            return result;
        }, { maxWait: 5000, timeout: 15000 });
        await acquired.promise;
        const second = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.cancel(cashOut.id, 'Second', business.members.staff2.id);
        }, { maxWait: 5000, timeout: 15000 });
        const rejected = expect(second).rejects.toBeInstanceOf(StaleStateError);
        try {
            await waitForCashUpLockWait();
        }
        finally {
            release.resolve();
        }
        const winner = await first;
        await rejected;
        expect(await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).toEqual(winner);
    });
    it("includes a cancellation committed before a waiting submission", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { cashOut } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashOuts.create({ amountLbp: '0.00', note: null, cashUpId: cashUp.id, amountUsd: '3.00', reason: 'Expense' });
        }, { maxWait: 5000, timeout: 15000 });
        const acquired = deferred();
        const release = deferred();
        const cancelling = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            await repos.cashOuts.cancel(cashOut.id, 'Not needed', business.members.staff1.id);
            acquired.resolve();
            await release.promise;
        }, { maxWait: 5000, timeout: 15000 });
        await acquired.promise;
        const submitting = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            await repos.cashUps.lockForUpdate(cashUp.id);
            return repos.cashUps.submit(cashUp.id, await snapshotForSubmit(repos, cashUp.id));
        }, { maxWait: 5000, timeout: 15000 });
        try {
            await waitForCashUpLockWait();
        }
        finally {
            release.resolve();
        }
        await cancelling;
        const submitted = await submitting;
        expect(submitted.status).toBe(CashUpStatus.SUBMITTED);
        expect(submitted.expectedUsd?.toFixed(2)).toBe('0.00');
        expect((await prisma.cashOut.findUniqueOrThrow({ where: { id: cashOut.id } })).status).toBe('CANCELLED');
    });
    it("serializes concurrent edits so the second audit entry chains from the first", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const { sale } = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.create(makeSaleInput(cashUp.id));
        }, { maxWait: 5000, timeout: 15000 });
        const acquired = deferred();
        const release = deferred();
        const firstEdit = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            await repos.cashUps.lockForUpdate(cashUp.id);
            acquired.resolve();
            await release.promise;
            return repos.sales.edit(sale.id, { businessAmountUsd: "15.00" }, business.members.staff1.id);
        }, { maxWait: 5000, timeout: 15000 });
        await acquired.promise;
        const secondEdit = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.sales.edit(sale.id, { businessAmountUsd: "20.00" }, business.members.staff2.id);
        }, { maxWait: 5000, timeout: 15000 });
        try {
            await waitForCashUpLockWait();
        }
        finally {
            release.resolve();
        }
        await Promise.all([firstEdit, secondEdit]);
        const result = await repositoriesForTest(({ businessId: business.id }).businessId).sales.findByIdWithEdits(sale.id);
        const edits = result?.edits.filter((edit) => edit.field === "businessAmountUsd");
        expect(edits).toHaveLength(2);
        expect(edits?.[0].newValue).toMatch(/^15(?:\.0+)?$/);
        expect(edits?.[1].oldValue).toMatch(/^15(?:\.0+)?$/);
        expect(edits?.[1].newValue).toMatch(/^20(?:\.0+)?$/);
    });
    it("allows exactly one of concurrent approve and return transitions", async () => {
        const business = fixtures.businessA;
        const cashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: business.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.submit(cashUp.id, {
                expectedUsd: "0.00",
                expectedLbp: "0.00",
                countedUsd: "0.00",
                countedLbp: "0.00",
                gapUsd: "0.00",
                gapLbp: "0.00",
            });
        }, { maxWait: 5000, timeout: 15000 });
        const acquired = deferred();
        const release = deferred();
        const approval = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            await repos.cashUps.lockForUpdate(cashUp.id);
            acquired.resolve();
            await release.promise;
            return repos.cashUps.approve(cashUp.id, business.members.manager.id, false);
        }, { maxWait: 5000, timeout: 15000 });
        await acquired.promise;
        const returning = prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: business.id }).businessId, tx);
            return repos.cashUps.returnToOpen(cashUp.id, "Return raced approval");
        }, { maxWait: 5000, timeout: 15000 });
        try {
            await waitForCashUpLockWait();
        }
        finally {
            release.resolve();
        }
        await approval;
        await expect(returning).rejects.toBeInstanceOf(StaleStateError);
        const finalCashUp = await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } });
        expect(finalCashUp.status).toBe(CashUpStatus.APPROVED);
        expect(finalCashUp.approvedAt).not.toBeNull();
        expect(finalCashUp.closedAt).not.toBeNull();
        expect(finalCashUp.returnReason).toBeNull();
    });
    it("scopes row locks to the active business and requires a transaction", async () => {
        const businessA = fixtures.businessA;
        const businessB = fixtures.businessB;
        const cashUpB = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessB.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessB.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.lockForUpdate(cashUpB.id);
        }, { maxWait: 5000, timeout: 15000 })).rejects.toBeInstanceOf(NotFoundError);
        const reposA = repositoriesForTest(({ businessId: businessA.id }).businessId);
        await expect(reposA.cashUps.lockForUpdate(cashUpB.id)).rejects.toBeInstanceOf(NotInTransactionError);
        await expect(reposA.cashUps.lockOpenForUpdate(cashUpB.id)).rejects.toBeInstanceOf(NotInTransactionError);
    });
    it("enforces one active manager per business in PostgreSQL", async () => {
        const { businessA, businessB } = fixtures;
        const secondManager = await prisma.user.create({
            data: { email: "business-a-second-manager@example.test", fullName: "Second Manager" },
        });
        await expect(prisma.$executeRaw `
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "status")
        VALUES (${randomUUID()}::uuid, ${secondManager.id}::uuid, ${businessA.id}::uuid, 'MANAGER', 'ACTIVE')
      `).rejects.toThrow();
        await prisma.$executeRaw `
      UPDATE "memberships"
      SET "status" = 'INACTIVE', "deactivatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${businessA.members.manager.id}::uuid
    `;
        await expect(prisma.$executeRaw `
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "status")
        VALUES (${randomUUID()}::uuid, ${secondManager.id}::uuid, ${businessA.id}::uuid, 'MANAGER', 'ACTIVE')
      `).resolves.toBe(1);
        expect(await prisma.membership.count({
            where: { businessId: businessA.id, role: "MANAGER", status: "ACTIVE" },
        })).toBe(1);
        expect(await prisma.membership.count({
            where: { businessId: businessB.id, role: "MANAGER", status: "ACTIVE" },
        })).toBe(1);
        const secondOwner = await prisma.user.create({
            data: { email: "business-a-second-owner-concurrency@example.test", fullName: "Second Owner" },
        });
        await expect(prisma.$executeRaw `
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "status")
        VALUES (${randomUUID()}::uuid, ${secondOwner.id}::uuid, ${businessA.id}::uuid, 'OWNER', 'ACTIVE')
      `).rejects.toThrow();
    });
});
