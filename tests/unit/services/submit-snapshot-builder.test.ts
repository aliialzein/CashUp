import { Prisma } from '../../../src/generated/prisma/client';
import { markTransactionRepositories } from '../../../src/services/ports';
import { SubmitSnapshotBuilder } from '../../../src/services/submit-snapshot-builder';
import { serviceRepositories } from './service-repositories';

describe('SubmitSnapshotBuilder', () => {
  it('reads transaction aggregates for the cash-up and returns persisted snapshot fields', async () => {
    const calls: string[] = [];
    const repositories = serviceRepositories({
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
        totalsByCurrency: async (id) => {
          calls.push(`cashouts:${id}`);
          return [];
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
    const builder = new SubmitSnapshotBuilder();
    const result = await builder.build(
      markTransactionRepositories(repositories),
      {
        id: 'cash-up-id',
        floatUsd: new Prisma.Decimal('5'),
        floatLbp: new Prisma.Decimal('0'),
      },
    );
    expect(calls).toEqual([
      'sales:cash-up-id',
      'change:cash-up-id',
      'cashouts:cash-up-id',
      'counts:cash-up-id',
    ]);
    expect(result).toEqual({
      expectedUsd: '15.00',
      expectedLbp: '0.00',
      countedUsd: '15.00',
      countedLbp: '0.00',
      gapUsd: '0.00',
      gapLbp: '0.00',
    });
  });
});
