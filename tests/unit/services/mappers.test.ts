import {
  mapCashUp,
  mapOpenCashUpSummary,
} from '../../../src/services/mappers/cash-up.mapper';
import { mapSale } from '../../../src/services/mappers/sale.mapper';
import { mapSaleLine } from '../../../src/services/mappers/sale.mapper';
import { mapCashOut } from '../../../src/services/mappers/cash-out.mapper';
import { mapCountEntry } from '../../../src/services/mappers/count-entry.mapper';
import type { SaleLineDto } from '../../../src/services/dto';

const date = new Date('2026-01-02T03:04:05.000Z');

describe('service DTO mappers', () => {
  it('formats cash-up decimals and timestamps as serializable values', () => {
    const dto = mapCashUp({
      id: 'cash-up-id',
      businessId: 'business-id',
      membershipId: 'membership-id',
      status: 'OPEN',
      floatUsd: { toString: () => '10' },
      floatLbp: { toString: () => '2000.5' },
      referenceRate: null,
      openedAt: date,
      countStartedAt: null,
      closedAt: null,
      approvedAt: null,
      voidedAt: null,
      approvedById: null,
      selfApproved: false,
      returnReason: null,
      voidReason: null,
      expectedUsd: null,
      expectedLbp: null,
      countedUsd: null,
      countedLbp: null,
      gapUsd: null,
      gapLbp: null,
    });
    expect(dto.floatUsd).toBe('10.00');
    expect(dto.floatLbp).toBe('2000.50');
    expect(dto.openedAt).toBe(date.toISOString());
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it('maps only the privacy-approved open summary fields', () => {
    const dto = mapOpenCashUpSummary({
      id: 'cash-up-id',
      openedAt: date,
      membership: { user: { fullName: 'Staff Member' } },
      _count: { sales: 3, requests: 1 },
    });
    expect(dto).toEqual({
      id: 'cash-up-id',
      openedAt: date.toISOString(),
      staffName: 'Staff Member',
      salesCount: 3,
      requestsCount: 1,
    });
    expect(Object.keys(dto).sort()).toEqual(
      ['id', 'openedAt', 'staffName', 'salesCount', 'requestsCount'].sort(),
    );
  });

  it('maps sales, cash-outs, and count entries to strings and ISO dates', () => {
    const sale = mapSale({
      id: 'sale-id',
      cashUpId: 'cash-up-id',
      saleNumber: 1,
      status: 'DELIVERED',
      businessAmount: { toString: () => '10' },
      deliveryFee: { toString: () => '0' },
      tip: null,
      discount: null,
      totalCollected: { toString: () => '10' },
      currency: 'USD',
      method: 'CASH',
      changeGiven: null,
      changeCurrency: null,
      clientNumber: 'private-number',
      note: null,
      mixedChange: false,
      amountDiffers: false,
      isEdited: false,
      deletionAwaiting: false,
      createdAt: date,
      deliveredAt: date,
      deletedAt: null,
      cancelReason: null,
    });
    expect(sale.businessAmount).toBe('10.00');
    expect(sale.createdAt).toBe(date.toISOString());

    expect(
      mapCashOut({
        id: 'cash-out-id',
        cashUpId: 'cash-up-id',
        amount: { toString: () => '2' },
        currency: 'USD',
        reason: 'Fuel',
        createdAt: date,
        updatedAt: date,
      }).amount,
    ).toBe('2.00');
    expect(
      mapCountEntry({
        id: 'count-id',
        cashUpId: 'cash-up-id',
        currency: 'LBP',
        denomination: { toString: () => '1000' },
        quantity: 3,
        updatedAt: date,
      }).denomination,
    ).toBe('1000.00');
  });

  it.each([
    ['DELIVERED', 'COLLECTED', '10.00', null],
    ['TO_DELIVER', 'NOT_YET', null, '10.00'],
    ['DELETED', 'CANCELLED', null, null],
  ] as const)(
    'maps %s money-taken state without presenting expected money as collected',
    (status, moneyTaken, amountCollected, amountExpected) => {
      const sale = mapSaleLine({
        id: 'sale-id',
        cashUpId: 'cash-up-id',
        saleNumber: 1,
        status,
        businessAmount: { toString: () => '8' },
        deliveryFee: { toString: () => '2' },
        tip: null,
        discount: null,
        totalCollected: { toString: () => '10' },
        currency: 'USD',
        method: 'CASH',
        changeGiven: null,
        changeCurrency: null,
        clientNumber: null,
        note: null,
        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,
        createdAt: date,
        deliveredAt: status === 'DELIVERED' ? date : null,
        deletedAt: status === 'DELETED' ? date : null,
        cancelReason: status === 'DELETED' ? 'Cancelled' : null,
      });
      const expected: Pick<
        SaleLineDto,
        'moneyTaken' | 'amountCollected' | 'amountExpected'
      > = { moneyTaken, amountCollected, amountExpected };
      expect(sale).toMatchObject(expected);
    },
  );
});
