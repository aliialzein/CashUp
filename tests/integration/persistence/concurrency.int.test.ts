import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import { Prisma } from "../../../src/generated/prisma/client";
import {
  CashUpStatus,
  Currency,
  PaymentMethod,
  SaleStatus,
} from "../../../src/generated/prisma/enums";
import {
  NotFoundError,
  NotInTransactionError,
  StaleStateError,
  type Repositories,
} from "../../../src/persistence";
import {
  makeSaleInput,
  prisma,
  resetDatabase,
  seedBusinesses,
  uow,
  type BusinessFixture,
  type Fixtures,
} from "./test-support";

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
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND query ILIKE ${'%FROM "cash_ups"%'}
          AND query ILIKE ${'%FOR UPDATE%'}
      ) AS waiting
    `);
    if (waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for a transaction to block on the cash-up row lock.");
}

async function snapshotForSubmit(
  repos: Repositories,
  cashUpId: string,
): Promise<{
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
    repos.cashOuts.totalsByCurrency(cashUpId),
    repos.counts.countedTotals(cashUpId),
  ]);
  const expected = {
    USD: new Prisma.Decimal(0),
    LBP: new Prisma.Decimal(0),
  };
  for (const row of sales) {
    expected[row.currency] = expected[row.currency].plus(row.totalCollected);
  }
  for (const row of changes) {
    expected[row.currency] = expected[row.currency].minus(row.total);
  }
  for (const row of cashOuts) {
    expected[row.currency] = expected[row.currency].minus(row.total);
  }
  return {
    expectedUsd: expected.USD.toFixed(2),
    expectedLbp: expected.LBP.toFixed(2),
    countedUsd: counts.USD.toFixed(2),
    countedLbp: counts.LBP.toFixed(2),
    gapUsd: counts.USD.minus(expected.USD).toFixed(2),
    gapLbp: counts.LBP.minus(expected.LBP).toFixed(2),
  };
}

async function runSubmitAgainstWrite(
  business: BusinessFixture,
  cashUpId: string,
  write: (repos: Repositories) => Promise<unknown>,
): Promise<Awaited<ReturnType<typeof snapshotForSubmit>>> {
  const acquired = deferred();
  const release = deferred();
  const submission = uow.run({ businessId: business.id }, async (repos) => {
    await repos.cashUps.lockForUpdate(cashUpId);
    const snapshot = await snapshotForSubmit(repos, cashUpId);
    acquired.resolve();
    await release.promise;
    const submitted = await repos.cashUps.submit(cashUpId, snapshot);
    return { submitted, snapshot };
  });

  await acquired.promise;
  const writing = uow.run({ businessId: business.id }, write);
  try {
    await waitForCashUpLockWait();
  } finally {
    release.resolve();
  }

  const { submitted, snapshot } = await submission;
  expect(submitted.status).toBe(CashUpStatus.SUBMITTED);
  await expect(writing).rejects.toBeInstanceOf(StaleStateError);
  return snapshot;
}

describe("cash-up write serialization", () => {
  jest.setTimeout(20_000);

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
    "counts.saveLines",
    "sales.markDelivered",
    "sales.cancelToDeliver",
  ])("%s waits for submit and is rejected after its commit", async (operation) => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    let saleId: string | undefined;
    let cashOutId: string | undefined;

    if (operation === "sales.edit") {
      saleId = (
        await uow.run({ businessId: business.id }, (repos) =>
          repos.sales.create(makeSaleInput(cashUp.id)),
        )
      ).sale.id;
    } else if (operation === "cashOuts.update") {
      cashOutId = (
        await uow.run({ businessId: business.id }, (repos) =>
          repos.cashOuts.create({
            cashUpId: cashUp.id,
            amount: "3.00",
            currency: Currency.USD,
            reason: "Before submit",
          }),
        )
      ).cashOut.id;
    } else if (operation === "counts.saveLines") {
      await uow.run({ businessId: business.id }, (repos) =>
        repos.counts.saveLines(cashUp.id, [
          { currency: Currency.USD, denomination: "10.00", quantity: 1 },
        ]),
      );
    } else if (operation === "sales.markDelivered" || operation === "sales.cancelToDeliver") {
      saleId = (
        await uow.run({ businessId: business.id }, (repos) =>
          repos.sales.create(
            makeSaleInput(cashUp.id, {
              status: SaleStatus.TO_DELIVER,
              clientNumber: `client-${operation}`,
            }),
          ),
        )
      ).sale.id;
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
            cashUpId: cashUp.id,
            amount: "2.00",
            currency: Currency.USD,
            reason: "Must not land after submit",
          });
        case "cashOuts.update":
          return repos.cashOuts.update(cashOutId!, { reason: "Must not land after submit" });
        case "counts.saveLines":
          return repos.counts.saveLines(cashUp.id, [
            { currency: Currency.USD, denomination: "10.00", quantity: 9 },
          ]);
        case "sales.markDelivered":
          return repos.sales.markDelivered(saleId!, {
            totalCollected: "11.00",
            currency: Currency.USD,
            method: PaymentMethod.CASH,
            amountDiffers: true,
            mixedChange: false,
          });
        case "sales.cancelToDeliver":
          return repos.sales.cancelToDeliver(saleId!, "Must not cancel after submit");
      }
    };

    const snapshot = await runSubmitAgainstWrite(business, cashUp.id, write);

    expect(await prisma.sale.findMany({ where: { cashUpId: cashUp.id } })).toEqual(salesBefore);
    expect(await prisma.saleEdit.count({ where: { sale: { cashUpId: cashUp.id } } })).toBe(
      saleEditsBefore,
    );
    expect(await prisma.cashOut.findMany({ where: { cashUpId: cashUp.id } })).toEqual(
      cashOutsBefore,
    );
    expect(await prisma.countEntry.findMany({ where: { cashUpId: cashUp.id } })).toEqual(
      countsBefore,
    );
    const finalCashUp = await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } });
    expect(finalCashUp.expectedUsd?.toFixed(2)).toBe(snapshot.expectedUsd);
  });

  it("serializes concurrent edits so the second audit entry chains from the first", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const { sale } = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUp.id)),
    );
    const acquired = deferred();
    const release = deferred();

    const firstEdit = uow.run({ businessId: business.id }, async (repos) => {
      await repos.cashUps.lockForUpdate(cashUp.id);
      acquired.resolve();
      await release.promise;
      return repos.sales.edit(sale.id, { businessAmount: "15.00" }, business.members.staff1.id);
    });
    await acquired.promise;
    const secondEdit = uow.run({ businessId: business.id }, (repos) =>
      repos.sales.edit(sale.id, { businessAmount: "20.00" }, business.members.staff2.id),
    );
    try {
      await waitForCashUpLockWait();
    } finally {
      release.resolve();
    }

    await Promise.all([firstEdit, secondEdit]);
    const result = await uow.repos({ businessId: business.id }).sales.findByIdWithEdits(sale.id);
    const edits = result?.edits.filter((edit) => edit.field === "businessAmount");
    expect(edits).toHaveLength(2);
    expect(edits?.[0].newValue).toMatch(/^15(?:\.0+)?$/);
    expect(edits?.[1].oldValue).toMatch(/^15(?:\.0+)?$/);
    expect(edits?.[1].newValue).toMatch(/^20(?:\.0+)?$/);
  });

  it("allows exactly one of concurrent approve and return transitions", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.submit(cashUp.id, {
        expectedUsd: "0.00",
        expectedLbp: "0.00",
        countedUsd: "0.00",
        countedLbp: "0.00",
        gapUsd: "0.00",
        gapLbp: "0.00",
      }),
    );

    const acquired = deferred();
    const release = deferred();
    const approval = uow.run({ businessId: business.id }, async (repos) => {
      await repos.cashUps.lockForUpdate(cashUp.id);
      acquired.resolve();
      await release.promise;
      return repos.cashUps.approve(cashUp.id, business.members.manager.id, false);
    });
    await acquired.promise;
    const returning = uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.returnToOpen(cashUp.id, "Return raced approval"),
    );
    try {
      await waitForCashUpLockWait();
    } finally {
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
    const cashUpB = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessB.members.staff1.id }),
    );

    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.lockForUpdate(cashUpB.id),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    const reposA = uow.repos({ businessId: businessA.id });
    await expect(reposA.cashUps.lockForUpdate(cashUpB.id)).rejects.toBeInstanceOf(
      NotInTransactionError,
    );
    await expect(reposA.cashUps.lockOpenForUpdate(cashUpB.id)).rejects.toBeInstanceOf(
      NotInTransactionError,
    );
  });

  it("enforces one active manager per business in PostgreSQL", async () => {
    const { businessA, businessB } = fixtures;
    const secondManager = await prisma.user.create({
      data: { email: "business-a-second-manager@example.test", fullName: "Second Manager" },
    });

    await expect(
      prisma.$executeRaw`
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "isActive")
        VALUES (${randomUUID()}::uuid, ${secondManager.id}::uuid, ${businessA.id}::uuid, 'MANAGER', true)
      `,
    ).rejects.toThrow();

    await prisma.$executeRaw`
      UPDATE "memberships"
      SET "isActive" = false
      WHERE "id" = ${businessA.members.manager.id}::uuid
    `;
    await expect(
      prisma.$executeRaw`
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "isActive")
        VALUES (${randomUUID()}::uuid, ${secondManager.id}::uuid, ${businessA.id}::uuid, 'MANAGER', true)
      `,
    ).resolves.toBe(1);

    expect(await prisma.membership.count({
      where: { businessId: businessA.id, role: "MANAGER", isActive: true },
    })).toBe(1);
    expect(await prisma.membership.count({
      where: { businessId: businessB.id, role: "MANAGER", isActive: true },
    })).toBe(1);

    const secondOwner = await prisma.user.create({
      data: { email: "business-a-second-owner-concurrency@example.test", fullName: "Second Owner" },
    });
    await expect(
      prisma.$executeRaw`
        INSERT INTO "memberships" ("id", "userId", "businessId", "role", "isActive")
        VALUES (${randomUUID()}::uuid, ${secondOwner.id}::uuid, ${businessA.id}::uuid, 'OWNER', true)
      `,
    ).rejects.toThrow();
  });
});
