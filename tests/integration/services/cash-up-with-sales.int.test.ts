import { SaleStatus } from '../../../src/persistence';
import { EntityNotFoundError } from '../../../src/services/errors';
import { makeSaleInput } from '../persistence/test-support';
import {
  managerActor,
  openEmptyCashUp,
  ownerActor,
  prisma,
  resetDatabase,
  seedBusinesses,
  services,
  staffActor,
  uow,
} from './service-test-support';

describe('cash-up queries with sales', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns all sale lines in order with money-taken semantics and status totals', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const cashUp = await openEmptyCashUp(business, staff);

    await uow.run({ businessId: business.id }, async (repos) => {
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '10.00',
          totalCollected: '10.00',
        }),
      );
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '20.00',
          totalCollected: '20.00',
          method: 'WHISH',
        }),
      );
      await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '30.00',
          totalCollected: '32.00',
          status: SaleStatus.TO_DELIVER,
          method: 'OMT',
        }),
      );
      const { sale: cancelled } = await repos.sales.create(
        makeSaleInput(cashUp.id, {
          businessAmount: '40.00',
          totalCollected: '40.00',
          status: SaleStatus.TO_DELIVER,
        }),
      );
      await repos.sales.cancelToDeliver(cancelled.id, 'Customer cancelled');
    });

    const result = await services.queries.getOwn(staff, cashUp.id);
    expect(result.sales.map(({ saleNumber }) => saleNumber)).toEqual([1, 2, 3, 4]);
    expect(result.sales.map(({ moneyTaken, amountCollected, amountExpected }) => ({
      moneyTaken,
      amountCollected,
      amountExpected,
    }))).toEqual([
      { moneyTaken: 'COLLECTED', amountCollected: '10.00', amountExpected: null },
      { moneyTaken: 'COLLECTED', amountCollected: '20.00', amountExpected: null },
      { moneyTaken: 'NOT_YET', amountCollected: null, amountExpected: '32.00' },
      { moneyTaken: 'CANCELLED', amountCollected: null, amountExpected: null },
    ]);
    expect(result.sales[3]).toMatchObject({
      status: SaleStatus.DELETED,
      cancelReason: 'Customer cancelled',
    });
    expect(result.salesSummary).toEqual({
      total: 4,
      delivered: 2,
      toDeliver: 1,
      deleted: 1,
    });
  });

  it('keeps open reviewer summaries private and includes sale data in review detail', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const manager = await managerActor(business);
    const openCashUp = await openEmptyCashUp(business, staff);
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(openCashUp.id)),
    );

    await expect(
      services.queries.getReviewDetail(manager, openCashUp.id),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    const summaries = await services.queries.listOpenSummaries(manager);
    expect(summaries).toContainEqual(
      expect.objectContaining({ id: openCashUp.id, salesCount: 1 }),
    );
    expect(Object.keys(summaries[0]).sort()).toEqual(
      ['id', 'openedAt', 'staffName', 'salesCount', 'requestsCount'].sort(),
    );
    expect(JSON.stringify(summaries)).not.toMatch(/amount|currency|totalCollected/i);

    const secondStaff = await staffActor(business, 2);
    const submitted = await openEmptyCashUp(business, secondStaff);
    await uow.run({ businessId: business.id }, (repos) =>
      repos.sales.create(makeSaleInput(submitted.id, { totalCollected: '12.00' })),
    );
    await services.lifecycle.submit(secondStaff, submitted.id);

    const detail = await services.queries.getReviewDetail(manager, submitted.id);
    expect(detail).toMatchObject({
      id: submitted.id,
      sales: [{ saleNumber: 1, moneyTaken: 'COLLECTED', amountCollected: '12.00' }],
      salesSummary: { total: 1, delivered: 1, toDeliver: 0, deleted: 0 },
      salesByCurrency: {
        USD: { totalCollected: '12.00' },
        LBP: { totalCollected: '0.00' },
      },
      walletTotals: {
        WHISH: { USD: '0.00', LBP: '0.00' },
        OMT: { USD: '0.00', LBP: '0.00' },
      },
    });
    expect(detail.flags).toMatchObject({ total: 1, deleted: 0 });
  });

  it('lists owned, submitted, and reviewed cash-ups according to the approval policy', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const manager = await managerActor(business);
    const cashUp = await openEmptyCashUp(business, staff);
    await services.lifecycle.submit(staff, cashUp.id);

    await expect(services.queries.listOwn(staff, { take: 10 })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cashUp.id })]),
    );
    await expect(services.queries.listSubmitted(manager)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cashUp.id })]),
    );
    await services.lifecycle.approve(manager, cashUp.id);

    const secondCashUp = await openEmptyCashUp(business, staff);
    await services.lifecycle.submit(staff, secondCashUp.id);
    await services.lifecycle.approve(manager, secondCashUp.id);
    const firstReviewedPage = await services.queries.listReviewed(manager, { take: 1 });
    expect(firstReviewedPage).toHaveLength(1);
    const firstReviewed = firstReviewedPage[0];
    if (!firstReviewed) throw new Error('Expected the first reviewed cash-up page to contain a row.');
    const secondReviewedPage = await services.queries.listReviewed(manager, {
      take: 1,
    cursorId: firstReviewed.id,
    });
    expect(secondReviewedPage).toHaveLength(1);
    expect(secondReviewedPage[0]?.id).not.toBe(firstReviewed.id);
    await expect(
      services.queries.listReviewed(await ownerActor(business), { take: 10 }),
    ).resolves.toEqual([]);
  });
});
