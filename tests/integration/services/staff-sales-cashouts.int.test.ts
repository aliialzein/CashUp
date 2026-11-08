import { prepareForSubmission } from './service-test-support';
import { randomUUID } from 'node:crypto';
import { confirmDeliverySchema } from '../../../src/modules/sales/sales.validation';
import { createCashOutSchema } from '../../../src/modules/cash-outs/cash-outs.validation';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
import { managerActor, prisma, resetDatabase, seedBusinesses, services, staffActor } from './service-test-support';
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
        });
        const usdKey = randomUUID();
        const first = await services.sales.create(staff, cashUp.id, usdInput, usdKey);
        const replay = await services.sales.create(staff, cashUp.id, usdInput, usdKey);
        expect(first.replayed).toBe(false);
        expect(replay.replayed).toBe(true);
        const lbpInput = createSaleSchema.parse({
            businessAmountUsd: '0.00',
            deliveryFeeUsd: '0.00',
            tipUsd: '0.00',
            tipLbp: '0.00',
            discountUsd: '0.00',
            discountLbp: '0.00',
            totalCollectedUsd: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            status: 'TO_DELIVER',
            businessAmountLbp: '500000.00',
            deliveryFeeLbp: '0.00',
            totalCollectedLbp: '500000.00',
            method: 'CASH',
            clientNumber: '+961123456',
        });
        const lbpSale = await services.sales.create(staff, cashUp.id, lbpInput, randomUUID());
        await services.sales.confirmDelivery(staff, cashUp.id, lbpSale.saleId, confirmDeliverySchema.parse({
            totalCollectedUsd: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            totalCollectedLbp: '500000.00',
            method: 'CASH',
        }));
        await services.cashOuts.create(staff, cashUp.id, createCashOutSchema.parse({
            amountLbp: '0.00', note: null,
            amountUsd: '2.00',
            reason: 'Shop supplies',
        }), randomUUID());
        await prepareForSubmission(staff, cashUp.id);
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
