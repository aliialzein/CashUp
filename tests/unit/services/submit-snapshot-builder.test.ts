import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { CashOutRepository } from '../../../src/modules/cash-outs/cash-outs.repository';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { Prisma } from '../../../src/generated/prisma/client';
import { buildCashUpSnapshot } from '../../../src/modules/cash-ups/cash-ups.workflow';
import { mockRepositories, testDatabase } from './repository-mocks';
describe('buildCashUpSnapshot', () => {
    it('reads transaction aggregates for the cash-up and returns persisted snapshot fields', async () => {
        const calls: string[] = [];
        mockRepositories({
            sales: {
                totalsByCurrencyAndMethod: async (id) => {
                    calls.push(`sales:${id}`);
                    return [
                        {
                            currency: 'USD',
                            method: 'CASH',
                            count: 1,
                            businessAmount: new Prisma.Decimal('10'),
                            deliveryFee: new Prisma.Decimal('0'),
                            totalCollected: new Prisma.Decimal('10'),
                            tip: new Prisma.Decimal('0'),
                            discount: new Prisma.Decimal('0'),
                        },
                    ];
                },
                changeGivenByCurrency: async (id) => {
                    calls.push(`change:${id}`);
                    return [];
                },
            },
            cashOuts: {
                listByCashUp: async (id) => {
                    calls.push(`cashouts:${id}`);
                    const now = new Date('2026-11-03T10:00:00.000Z');
                    return [
                        {
                            amountLbp: new Prisma.Decimal('0.00'),
                            note: null,
                            id: 'active-cashout',
                            cashUpId: id,
                            amountUsd: new Prisma.Decimal('2'),
                            reason: 'Supplies',
                            status: 'ACTIVE',
                            cancelReason: null,
                            cancelledAt: null,
                            cancelledByMembershipId: null,
                            idempotencyKey: null,
                            createdAt: now,
                            updatedAt: now,
                        },
                        {
                            amountLbp: new Prisma.Decimal('0.00'),
                            note: null,
                            id: 'cancelled-cashout',
                            cashUpId: id,
                            amountUsd: new Prisma.Decimal('5'),
                            reason: 'Returned supplies',
                            status: 'CANCELLED',
                            cancelReason: 'No longer needed',
                            cancelledAt: now,
                            cancelledByMembershipId: 'staff-membership-id',
                            idempotencyKey: null,
                            createdAt: now,
                            updatedAt: now,
                        },
                    ];
                },
            },
            counts: {
                countedTotals: async (id) => {
                    calls.push(`counts:${id}`);
                    return {
                        USD: new Prisma.Decimal('15'),
                        LBP: new Prisma.Decimal('0'),
                    };
                },
            },
        });
        const db = testDatabase();
        const result = await buildCashUpSnapshot(new SaleRepository('business-id', db), new CashOutRepository('business-id', db), new CashUpRepository('business-id', db), {
            id: 'cash-up-id',
            floatUsd: new Prisma.Decimal('5'),
            floatLbp: new Prisma.Decimal('0'),
        });
        expect(calls).toEqual([
            'sales:cash-up-id',
            'change:cash-up-id',
            'cashouts:cash-up-id',
            'counts:cash-up-id',
        ]);
        expect(result).toEqual({
            expectedUsd: '13.00',
            expectedLbp: '0.00',
            countedUsd: '15.00',
            countedLbp: '0.00',
            gapUsd: '2.00',
            gapLbp: '0.00',
        });
    });
});
