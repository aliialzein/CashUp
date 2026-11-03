import { randomUUID } from "node:crypto";
import {
  AuditAction,
  AuditEntityType,
  Currency,
  PaymentMethod,
  SaleStatus,
} from "../../../src/generated/prisma/enums";
import {
  DuplicateError,
  NotFoundError,
  StaleStateError,
} from "../../../src/persistence";
import {
  makeSaleInput,
  prisma,
  resetDatabase,
  seedBusinesses,
  uow,
  type Fixtures,
} from "./test-support";

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

  it("isolates cash-ups, sales, cash-outs, counts, and audit rows by tenant", async () => {
    const businessB = fixtures.businessB;
    const cashUpB = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessB.members.staff1.id }),
    );
    const { sale: saleB } = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUpB.id)),
    );
    const { cashOut: cashOutB } = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUpB.id,
        amount: "5.00",
        currency: Currency.USD,
        reason: "Test cash-out",
      }),
    );

    await uow.run({ businessId: businessB.id }, async (repos) => {
      await repos.counts.saveLines(cashUpB.id, [
        { currency: Currency.USD, denomination: "10.00", quantity: 2 },
      ]);
      await repos.audit.append({
        actorUserId: businessB.members.owner.userId,
        action: AuditAction.CASHUP_OPENED,
        entityType: AuditEntityType.CASH_UP,
        entityId: cashUpB.id,
      });

    });

    const businessA = fixtures.businessA;
    const reposA = uow.repos({ businessId: businessA.id });
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.open({ membershipId: businessB.members.staff2.id }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await reposA.cashUps.findById(cashUpB.id)).toBeNull();
    expect(await reposA.sales.findById(saleB.id)).toBeNull();
    expect(await reposA.cashOuts.findById(cashOutB.id)).toBeNull();
    expect(await reposA.cashOuts.listByCashUp(cashUpB.id)).toHaveLength(0);
    expect(await reposA.counts.listByCashUp(cashUpB.id)).toHaveLength(0);
    expect(await reposA.audit.list({ entityId: cashUpB.id })).toHaveLength(0);

    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.submit(cashUpB.id, snapshot),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.sales.create(makeSaleInput(cashUpB.id)),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.sales.edit(saleB.id, { note: "Cross-tenant edit" }, businessA.members.staff1.id),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashOuts.create({
          cashUpId: cashUpB.id,
          amount: "1.00",
          currency: Currency.USD,
          reason: "Cross-tenant write",
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashOuts.update(cashOutB.id, { reason: "Cross-tenant edit" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.counts.saveLines(cashUpB.id, [
          { currency: Currency.USD, denomination: "1.00", quantity: 1 },
        ]),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    const tenantAEntry = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.audit.append({
        actorUserId: businessA.members.owner.userId,
        action: AuditAction.CASHUP_OPENED,
        entityType: AuditEntityType.CASH_UP,
        entityId: cashUpB.id,
      }),
    );
    expect(tenantAEntry.businessId).toBe(businessA.id);
    expect(await uow.repos({ businessId: businessB.id }).audit.list({ entityId: cashUpB.id }))
      .toHaveLength(1);
  });

  it("isolates business settings and counts awaiting requests by tenant and cash-up", async () => {
    const businessA = fixtures.businessA;
    const businessB = fixtures.businessB;
    const reposA = uow.repos({ businessId: businessA.id });
    const reposB = uow.repos({ businessId: businessB.id });

    expect(await reposA.businesses.findSettings()).toEqual({
      id: businessA.id,
      name: businessA.name,
      isSolo: false,
    });
    expect(await reposA.businesses.findSettings()).not.toEqual(
      await reposB.businesses.findSettings(),
    );

    const cashUpA = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessA.members.staff1.id }),
    );
    const cashUpB = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessB.members.staff1.id }),
    );
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
    const cashUpA = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessA.members.staff1.id }),
    );
    const cashUpB = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessB.members.staff1.id }),
    );
    const reposA = uow.repos({ businessId: businessA.id });
    const reposB = uow.repos({ businessId: businessB.id });

    await uow.run({ businessId: businessA.id }, async (repos) => {
      await repos.sales.create(makeSaleInput(cashUpA.id));
      await repos.sales.create(
        makeSaleInput(cashUpA.id, { status: SaleStatus.TO_DELIVER }),
      );
      const { sale } = await repos.sales.create(
        makeSaleInput(cashUpA.id, { status: SaleStatus.TO_DELIVER }),
      );
      await repos.sales.cancelToDeliver(sale.id, "Customer cancelled");
    });
    await uow.run({ businessId: businessB.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUpB.id)),
    );

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
    await expect(
      uow.run({ businessId: business.id }, async (repos) => {
        const cashUp = await repos.cashUps.open({ membershipId: business.members.staff1.id });
        await repos.audit.append({
          actorUserId: business.members.owner.userId,
          action: AuditAction.CASHUP_OPENED,
          entityType: AuditEntityType.CASH_UP,
          entityId: cashUp.id,
        });
        throw new Error("force transaction rollback");
      }),
    ).rejects.toThrow("force transaction rollback");
    expect(await uow.repos({ businessId: business.id }).cashUps.listOpenSummaries()).toHaveLength(0);
    expect(await uow.repos({ businessId: business.id }).audit.list()).toHaveLength(0);
  });

  it("guards open, submit, approve, return, void, and concurrent approval transitions", async () => {
    const { businessA, businessB } = fixtures;
    const first = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessA.members.staff1.id, floatUsd: "20.00" }),
    );

    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.open({ membershipId: businessA.members.staff1.id }),
      ),
    ).rejects.toBeInstanceOf(DuplicateError);

    await uow.run({ businessId: businessA.id }, (repos) => repos.cashUps.submit(first.id, snapshot));
    const approved = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.approve(first.id, businessA.members.manager.id, false),
    );
    expect(approved.status).toBe("APPROVED");
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.approve(first.id, businessA.members.manager.id, false),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);

    const returnedCandidate = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessA.members.staff1.id }),
    );
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.approve(returnedCandidate.id, businessA.members.manager.id, false),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);

    await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.submit(returnedCandidate.id, snapshot),
    );
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.voidCashUp(returnedCandidate.id, "Not open"),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    const returned = await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.returnToOpen(returnedCandidate.id, "Please recount"),
    );
    expect(returned.status).toBe("OPEN");
    expect(returned.closedAt).toBeNull();
    expect(returned.expectedUsd).toBeNull();
    expect(returned.expectedLbp).toBeNull();
    expect(returned.countedUsd).toBeNull();
    expect(returned.countedLbp).toBeNull();
    expect(returned.gapUsd).toBeNull();
    expect(returned.gapLbp).toBeNull();
    expect(returned.returnReason).toBe("Please recount");
    await uow.run({ businessId: businessA.id }, (repos) =>
      repos.cashUps.voidCashUp(returnedCandidate.id, "Shift cancelled"),
    );
    await expect(
      uow.run({ businessId: businessA.id }, (repos) =>
        repos.cashUps.voidCashUp(returnedCandidate.id, "Already void"),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);

    const concurrentCashUp = await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.open({ membershipId: businessB.members.staff1.id }),
    );
    await uow.run({ businessId: businessB.id }, (repos) =>
      repos.cashUps.submit(concurrentCashUp.id, snapshot),
    );
    const decisions = await Promise.allSettled([
      uow.run({ businessId: businessB.id }, (repos) =>
        repos.cashUps.approve(concurrentCashUp.id, businessB.members.manager.id, false),
      ),
      uow.run({ businessId: businessB.id }, (repos) =>
        repos.cashUps.approve(concurrentCashUp.id, businessB.members.owner.id, false),
      ),
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
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const { sale } = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUp.id)),
    );
    const { cashOut } = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: "2.00",
        currency: Currency.USD,
        reason: "Before approval",
      }),
    );
    await uow.run({ businessId: business.id }, (repos) =>
      repos.counts.saveLines(cashUp.id, [
        { currency: Currency.USD, denomination: "1.00", quantity: 1 },
      ]),
    );
    await uow.run({ businessId: business.id }, (repos) => repos.cashUps.submit(cashUp.id, snapshot));
    await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.approve(cashUp.id, business.members.manager.id, false),
    );

    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.create(makeSaleInput(cashUp.id)),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.edit(sale.id, { note: "After approval" }, business.members.staff1.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.cashOuts.create({
          cashUpId: cashUp.id,
          amount: "1.00",
          currency: Currency.USD,
          reason: "After approval",
        }),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.cashOuts.update(cashOut.id, { reason: "After approval" }),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.counts.saveLines(cashUp.id, [
          { currency: Currency.USD, denomination: "1.00", quantity: 2 },
        ]),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
  });

  it("allocates gap-free concurrent sale numbers and makes idempotent creates", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        uow.run({ businessId: business.id }, (repos) =>
          repos.sales.create(makeSaleInput(cashUp.id)),
        ),
      ),
    );
    expect(results.map(({ sale }) => sale.saleNumber).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );

    const idempotencyKey = randomUUID();
    const firstSale = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUp.id, { idempotencyKey })),
    );
    const secondSale = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUp.id, { idempotencyKey })),
    );
    expect(firstSale.created).toBe(true);
    expect(secondSale.created).toBe(false);
    expect(secondSale.sale.id).toBe(firstSale.sale.id);
    expect(await prisma.sale.count({ where: { businessId: business.id, idempotencyKey } })).toBe(1);
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).lastSaleNumber)
      .toBe(21);

    const cashOutKey = randomUUID();
    const firstCashOut = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: "4.00",
        currency: Currency.USD,
        reason: "Idempotent",
        idempotencyKey: cashOutKey,
      }),
    );
    const secondCashOut = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: "4.00",
        currency: Currency.USD,
        reason: "Idempotent",
        idempotencyKey: cashOutKey,
      }),
    );
    expect(firstCashOut.created).toBe(true);
    expect(secondCashOut.created).toBe(false);
    expect(secondCashOut.cashOut.id).toBe(firstCashOut.cashOut.id);
    expect(await prisma.cashOut.count({ where: { cashUpId: cashUp.id, idempotencyKey: cashOutKey } }))
      .toBe(1);
  });

  it("logs changed sale fields, compares money numerically, and guards sale states", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const { sale } = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(cashUp.id)),
    );

    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.edit(
        sale.id,
        { businessAmount: "15.00", note: "Corrected" },
        business.members.staff1.id,
      ),
    );
    const withEdits = await uow.repos({ businessId: business.id }).sales.findByIdWithEdits(sale.id);
    expect(withEdits?.isEdited).toBe(true);
    expect(withEdits?.edits).toHaveLength(2);
    const amountEdit = withEdits?.edits.find((edit) => edit.field === "businessAmount");
    expect(amountEdit?.oldValue).toMatch(/^10(?:\.0+)?$/);
    expect(amountEdit?.newValue).toMatch(/^15(?:\.0+)?$/);

    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.edit(sale.id, { businessAmount: "15" }, business.members.staff1.id),
    );
    expect(
      (await uow.repos({ businessId: business.id }).sales.findByIdWithEdits(sale.id))?.edits,
    ).toHaveLength(2);

    const delivery = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          status: SaleStatus.TO_DELIVER,
          clientNumber: "123",
          totalCollected: "20.00",
        }),
      ),
    );
    const delivered = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.markDelivered(delivery.sale.id, {
        totalCollected: "22.00",
        currency: Currency.USD,
        method: PaymentMethod.CASH,
        amountDiffers: true,
        mixedChange: false,
      }),
    );
    expect(delivered.status).toBe(SaleStatus.DELIVERED);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.markDelivered(delivery.sale.id, {
          totalCollected: "22.00",
          currency: Currency.USD,
          method: PaymentMethod.CASH,
          amountDiffers: false,
          mixedChange: false,
        }),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.cancelToDeliver(delivery.sale.id, "Already delivered"),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);

    await expect(
      uow.run({ businessId: business.id }, (repos) => repos.sales.lockForDeletion(delivery.sale.id)),
    ).resolves.toMatchObject({ deletionAwaiting: true });
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.edit(delivery.sale.id, { note: "Locked" }, business.members.staff1.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.releaseDeletionLock(delivery.sale.id),
    );
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.releaseDeletionLock(delivery.sale.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) => repos.sales.markDeleted(delivery.sale.id)),
    ).rejects.toBeInstanceOf(StaleStateError);
    await uow.run({ businessId: business.id }, (repos) => repos.sales.lockForDeletion(delivery.sale.id));
    const deleted = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.markDeleted(delivery.sale.id),
    );
    expect(deleted.status).toBe(SaleStatus.DELETED);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.lockForDeletion(delivery.sale.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) => repos.sales.markDeleted(delivery.sale.id)),
    ).rejects.toBeInstanceOf(StaleStateError);
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.edit(delivery.sale.id, { note: "Deleted" }, business.members.staff1.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);

    const cancelled = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          status: SaleStatus.TO_DELIVER,
          clientNumber: "456",
        }),
      ),
    );
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.lockForDeletion(cancelled.sale.id),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.cancelToDeliver(cancelled.sale.id, "Customer cancelled"),
    );
    await expect(
      uow.run({ businessId: business.id }, (repos) =>
        repos.sales.cancelToDeliver(cancelled.sale.id, "Already cancelled"),
      ),
    ).rejects.toBeInstanceOf(StaleStateError);
    expect(await uow.repos({ businessId: business.id }).sales.list(cashUp.id)).not.toContainEqual(
      expect.objectContaining({ id: cancelled.sale.id }),
    );
  });

  it("aggregates only delivered sales by currency and method without converting money", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );

    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: "10.00",
          deliveryFee: "2.00",
          tip: "1.00",
          totalCollected: "13.00",
          changeGiven: "2.00",
          changeCurrency: Currency.USD,
        }),
      ),
    );
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: "5.00",
          deliveryFee: "0.00",
          totalCollected: "5.00",
          currency: Currency.USD,
          method: PaymentMethod.WHISH,
          changeGiven: "1.00",
          changeCurrency: Currency.USD,
        }),
      ),
    );
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: "1000000.00",
          deliveryFee: "50000.00",
          totalCollected: "1050000.00",
          currency: Currency.LBP,
          method: PaymentMethod.WHISH,
          changeGiven: "50000.00",
          changeCurrency: Currency.LBP,
        }),
      ),
    );
    const pending = await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(
        makeSaleInput(cashUp.id, {
          status: SaleStatus.TO_DELIVER,
          totalCollected: "700000.00",
          currency: Currency.LBP,
          method: PaymentMethod.CASH,
          clientNumber: "789",
        }),
      ),
    );
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.cancelToDeliver(pending.sale.id, "Not delivered"),
    );

    const totals = await uow.repos({ businessId: business.id }).sales.totalsByCurrencyAndMethod(
      cashUp.id,
    );
    expect(totals).toHaveLength(3);
    expect(
      totals.find((row) => row.currency === Currency.USD && row.method === PaymentMethod.CASH)?.count,
    ).toBe(1);
    expect(
      totals
        .find((row) => row.currency === Currency.USD && row.method === PaymentMethod.CASH)
        ?.totalCollected.toString(),
    ).toBe("13");
    expect(
      totals
        .find((row) => row.currency === Currency.LBP && row.method === PaymentMethod.WHISH)
        ?.totalCollected.toString(),
    ).toBe("1050000");
    const changeTotals = await uow
      .repos({ businessId: business.id })
      .sales.changeGivenByCurrency(cashUp.id);
    expect(changeTotals.find((row) => row.currency === Currency.USD)?.total.toString()).toBe("3");
    expect(changeTotals.find((row) => row.currency === Currency.LBP)?.total.toString()).toBe(
      "50000",
    );
    expect(await uow.repos({ businessId: business.id }).sales.list(cashUp.id)).toHaveLength(3);
  });

  it("upserts count lines, preserves countStartedAt, and keeps currencies separate", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const lines = [
      { currency: Currency.USD, denomination: "20.00", quantity: 1 },
      { currency: Currency.LBP, denomination: "100000.00", quantity: 2 },
    ];
    await uow.run({ businessId: business.id }, (repos) => repos.counts.saveLines(cashUp.id, lines));
    const sentinel = new Date("2020-01-02T03:04:05.000Z");
    await prisma.cashUp.update({
      where: { id: cashUp.id },
      data: { countStartedAt: sentinel },
    });
    await uow.run({ businessId: business.id }, (repos) =>
      repos.counts.saveLines(cashUp.id, [
        { currency: Currency.USD, denomination: "20.00", quantity: 2 },
        { currency: Currency.LBP, denomination: "100000.00", quantity: 3 },
      ]),
    );

    expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(2);
    expect((await prisma.cashUp.findUniqueOrThrow({ where: { id: cashUp.id } })).countStartedAt)
      .toEqual(sentinel);
    const totals = await uow.repos({ businessId: business.id }).counts.countedTotals(cashUp.id);
    expect(totals.USD.toString()).toBe("40");
    expect(totals.LBP.toString()).toBe("300000");
  });

  it("serializes count saves with a concurrent submit transition", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );

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

    const saving = uow.run({ businessId: business.id }, (repos) =>
      repos.counts.saveLines(cashUp.id, [
        { currency: Currency.USD, denomination: "1.00", quantity: 5 },
      ]),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseTransition();
    await transition;
    await expect(saving).rejects.toBeInstanceOf(StaleStateError);
    expect(await prisma.countEntry.count({ where: { cashUpId: cashUp.id } })).toBe(0);
  });

  it("updates cash-outs with before/after values and keeps their totals separate", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const { cashOut } = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: "10.00",
        currency: Currency.USD,
        reason: "Initial",
      }),
    );
    const updated = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.update(cashOut.id, { amount: "12.50", reason: "Updated" }),
    );
    expect(updated.before.amount.toString()).toBe("10");
    expect(updated.after.amount.toString()).toBe("12.5");
    expect(updated.after.reason).toBe("Updated");

    await uow.run({ businessId: business.id }, (repos) =>
      repos.cashOuts.create({
        cashUpId: cashUp.id,
        amount: "2000.00",
        currency: Currency.LBP,
        reason: "LBP expense",
      }),
    );
    const totals = await uow.repos({ businessId: business.id }).cashOuts.totalsByCurrency(
      cashUp.id,
    );
    expect(totals.find((row) => row.currency === Currency.USD)?.total.toString()).toBe("12.5");
    expect(totals.find((row) => row.currency === Currency.LBP)?.total.toString()).toBe("2000");
  });

  it("limits reviewer reads of open cash-ups to non-monetary summaries", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({
        membershipId: business.members.staff1.id,
        floatUsd: "500.00",
        floatLbp: "250000.00",
      }),
    );
    const repos = uow.repos({ businessId: business.id });
    expect(await repos.cashUps.findForReview(cashUp.id)).toBeNull();
    const [summary] = await repos.cashUps.listOpenSummaries();
    expect(summary.id).toBe(cashUp.id);
    expect(Object.keys(summary).sort()).toEqual(["_count", "id", "membership", "openedAt"]);
  });

  it("enforces database constraints, append-only audit, and Restrict deletes", async () => {
    const business = fixtures.businessA;
    const cashUp = await uow.run({ businessId: business.id }, (repos) =>
      repos.cashUps.open({ membershipId: business.members.staff1.id }),
    );
    const secondOwner = await prisma.user.create({
      data: { email: "business-a-second-owner@example.test", fullName: "Second owner" },
    });

    await expect(
      prisma.$executeRaw`
        INSERT INTO "memberships" ("id", "userId", "businessId", "role")
        VALUES (${randomUUID()}::uuid, ${secondOwner.id}::uuid, ${business.id}::uuid, 'OWNER')
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO "join_codes" ("id", "businessId", "codeHash", "role", "label", "expiresAt", "createdById")
        VALUES (${randomUUID()}::uuid, ${business.id}::uuid, ${randomUUID()}, 'OWNER', 'invalid', NOW(), ${business.members.owner.userId}::uuid)
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO "sales" ("id", "businessId", "cashUpId", "saleNumber", "businessAmount", "deliveryFee", "totalCollected", "currency", "method", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${business.id}::uuid, ${cashUp.id}::uuid, 9001, -1, 0, 0, 'USD', 'CASH', NOW())
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO "cash_outs" ("id", "cashUpId", "amount", "currency", "reason", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${cashUp.id}::uuid, 0, 'USD', 'invalid', NOW())
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO "count_entries" ("id", "cashUpId", "currency", "denomination", "quantity", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${cashUp.id}::uuid, 'USD', 1, -1, NOW())
      `,
    ).rejects.toThrow();

    const audit = await uow.run({ businessId: business.id }, (repos) =>
      repos.audit.append({
        actorUserId: business.members.owner.userId,
        action: AuditAction.CASHUP_OPENED,
        entityType: AuditEntityType.CASH_UP,
        entityId: cashUp.id,
      }),
    );
    await expect(
      prisma.$executeRaw`UPDATE "audit_logs" SET "action" = 'CASHUP_VOIDED' WHERE "id" = ${audit.id}::uuid`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM "audit_logs" WHERE "id" = ${audit.id}::uuid`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM "businesses" WHERE "id" = ${business.id}::uuid`,
    ).rejects.toThrow();
  });
});
