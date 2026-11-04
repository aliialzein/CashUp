import { randomUUID } from 'node:crypto';
import {
  confirmDeliverySchema,
  createCashOutSchema,
  createSaleSchema,
} from '../../../src/validation';
import {
  managerActor,
  prisma,
  resetDatabase,
  seedBusinesses,
  services,
  staffActor,
} from './service-test-support';

describe('Staff sales and cash-outs', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('replays keyed creates once and includes both currencies in review snapshots', async () => {
    const fixtures = await seedBusinesses();
    const business = fixtures.businessA;
    const staff = await staffActor(business);
    const manager = await managerActor(business);
    const cashUp = await services.lifecycle.open(staff, {
      floatUsd: '20.00',
      floatLbp: '0.00',
    });

    const usdInput = createSaleSchema.parse({
      status: 'DELIVERED',
      businessAmount: '10.00',
      deliveryFee: '0.00',
      totalCollected: '10.00',
      currency: 'USD',
      method: 'CASH',
    });
    const usdKey = randomUUID();
    const first = await services.sales.create(staff, cashUp.id, usdInput, usdKey);
    const replay = await services.sales.create(staff, cashUp.id, usdInput, usdKey);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);

    const lbpInput = createSaleSchema.parse({
      status: 'TO_DELIVER',
      businessAmount: '500000.00',
      deliveryFee: '0.00',
      totalCollected: '500000.00',
      currency: 'LBP',
      method: 'CASH',
      clientNumber: '+961123456',
    });
    const lbpSale = await services.sales.create(
      staff,
      cashUp.id,
      lbpInput,
      randomUUID(),
    );
    await services.sales.confirmDelivery(
      staff,
      cashUp.id,
      lbpSale.saleId,
      confirmDeliverySchema.parse({
        totalCollected: '500000.00',
        currency: 'LBP',
        method: 'CASH',
      }),
    );

    await services.cashOuts.create(
      staff,
      cashUp.id,
      createCashOutSchema.parse({
        amount: '2.00',
        currency: 'USD',
        reason: 'Shop supplies',
      }),
      randomUUID(),
    );

    await services.lifecycle.submit(staff, cashUp.id);
    const detail = await services.queries.getReviewDetail(manager, cashUp.id);
    expect(detail.salesSummary).toEqual({
      total: 2,
      delivered: 2,
      toDeliver: 0,
      deleted: 0,
    });
    expect(detail.cashOuts).toHaveLength(1);
    expect(detail.expectedAndGap).toMatchObject({
      USD: { expected: '28.00', counted: '0.00', gap: '-28.00' },
      LBP: { expected: '500000.00', counted: '0.00', gap: '-500000.00' },
    });
  });
});
