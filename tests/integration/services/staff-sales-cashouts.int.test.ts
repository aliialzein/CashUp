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

            discountUsd: '0.00',
            discountLbp: '0.00',

            status: 'TO_DELIVER',
            businessAmountLbp: '500000.00',
            deliveryFeeLbp: '0.00',

            clientNumber: '+961123456',
        });
        const lbpSale = await services.sales.create(staff, cashUp.id, lbpInput, randomUUID());
        await services.sales.confirmDelivery(staff, cashUp.id, lbpSale.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00',
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
    it('validates direct-sale mixed-currency change with the persisted cash-up rate', async () => {
        const { businessA } = await seedBusinesses();
        const staff = await staffActor(businessA);
        const cashUp = await services.lifecycle.open(staff, { referenceRate: '89500' });
        const mixedSale = createSaleSchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00',
            status: 'DELIVERED',
            businessAmountUsd: '12',
            totalCollectedUsd: '20',
            changeGivenUsd: '5',
            changeGivenLbp: '268500',
            method: 'CASH',
        });
        const delivered = await services.sales.create(staff, cashUp.id, mixedSale, randomUUID());
        expect(delivered.sale).toMatchObject({
            totalCollectedUsd: '20.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '5.00',
            changeGivenLbp: '268500.00',
        });
        await expect(services.sales.create(staff, cashUp.id, createSaleSchema.parse({ ...mixedSale,
            changeGivenLbp: '270000',
        }), randomUUID())).rejects.toMatchObject({ code: 'SALE_NOT_BALANCED' });

        const staffWithoutRate = await staffActor(businessA, 2);
        const cashUpWithoutRate = await services.lifecycle.open(staffWithoutRate, {});
        await expect(services.sales.create(staffWithoutRate, cashUpWithoutRate.id, createSaleSchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00',
            status: 'DELIVERED',
            businessAmountUsd: '12',
            totalCollectedUsd: '20',
            changeGivenUsd: '5',
            changeGivenLbp: '268500',
            method: 'CASH',
        }), randomUUID())).rejects.toMatchObject({ code: 'SALE_REQUIRES_REFERENCE_RATE' });
        await expect(services.sales.create(staffWithoutRate, cashUpWithoutRate.id, createSaleSchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00', changeGivenUsd: '0.00', changeGivenLbp: '0.00',
            status: 'DELIVERED',
            businessAmountUsd: '12',
            totalCollectedUsd: '12',
            method: 'CASH',
        }), randomUUID())).resolves.toMatchObject({ sale: { totalCollectedUsd: '12.00' } });
        const plannedSale = createSaleSchema.parse({
            status: 'TO_DELIVER',
            businessAmountUsd: '12',

            clientNumber: '+961123456',
        });
        const sameCurrencyDiscrepancy = await services.sales.create(staffWithoutRate, cashUpWithoutRate.id, plannedSale, randomUUID());
        await expect(services.sales.confirmDelivery(staffWithoutRate, cashUpWithoutRate.id, sameCurrencyDiscrepancy.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00', changeGivenUsd: '0.00', changeGivenLbp: '0.00',
            totalCollectedUsd: '13',
            method: 'CASH',
        }))).resolves.toMatchObject({ sale: { amountDiffers: true } });
        const mixedDelivery = await services.sales.create(staffWithoutRate, cashUpWithoutRate.id, plannedSale, randomUUID());
        await expect(services.sales.confirmDelivery(staffWithoutRate, cashUpWithoutRate.id, mixedDelivery.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00',
            totalCollectedUsd: '20',
            changeGivenUsd: '5',
            changeGivenLbp: '268500',
            method: 'CASH',
        }))).rejects.toMatchObject({ code: 'SALE_REQUIRES_REFERENCE_RATE' });
    });
    it('keeps delivery discrepancies accepted, compares final due by rate, and preserves drawer currencies', async () => {
        const { businessA } = await seedBusinesses();
        const staff = await staffActor(businessA);
        const cashUp = await services.lifecycle.open(staff, { referenceRate: '89500' });
        const plannedSale = createSaleSchema.parse({
            status: 'TO_DELIVER',
            businessAmountUsd: '12',

            clientNumber: '+961123456',
        });
        const mixedDelivery = await services.sales.create(staff, cashUp.id, plannedSale, randomUUID());
        const delivered = await services.sales.confirmDelivery(staff, cashUp.id, mixedDelivery.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00',
            totalCollectedUsd: '20',
            changeGivenUsd: '5',
            changeGivenLbp: '268500',
            method: 'CASH',
        }));
        expect(delivered.sale.amountDiffers).toBe(false);
        expect((await services.queries.getOwn(staff, cashUp.id)).ledger).toMatchObject({
            receivedUsd: '20.00',
            receivedLbp: '0.00',
            changeGivenUsd: '5.00',
            changeGivenLbp: '268500.00',
            expectedUsd: '15.00',
            expectedLbp: '-268500.00',
        });

        const equivalentTender = await services.sales.create(staff, cashUp.id, plannedSale, randomUUID());
        await expect(services.sales.confirmDelivery(staff, cashUp.id, equivalentTender.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', changeGivenUsd: '0.00',
            totalCollectedUsd: '0',
            totalCollectedLbp: '1790000',
            changeGivenLbp: '716000',
            method: 'CASH',
        }))).resolves.toMatchObject({ sale: { amountDiffers: false } });

        const methodChange = await services.sales.create(staff, cashUp.id, plannedSale, randomUUID());
        await expect(services.sales.confirmDelivery(staff, cashUp.id, methodChange.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00', changeGivenLbp: '0.00',
            totalCollectedUsd: '20',
            changeGivenUsd: '8',
            method: 'WHISH',
        }))).resolves.toMatchObject({ sale: { amountDiffers: false } });
        const amountChange = await services.sales.create(staff, cashUp.id, plannedSale, randomUUID());
        await expect(services.sales.confirmDelivery(staff, cashUp.id, amountChange.saleId, confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00', totalCollectedLbp: '0.00', changeGivenLbp: '0.00',
            totalCollectedUsd: '21',
            changeGivenUsd: '8',
            method: 'CASH',
        }))).resolves.toMatchObject({ sale: { amountDiffers: true } });
    });
});
