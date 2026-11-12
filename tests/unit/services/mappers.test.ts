import { mapCashUp, mapOpenCashUpSummary } from '../../../src/modules/cash-ups/cash-ups.mapper';
import { mapSale } from '../../../src/modules/sales/sales.mapper';
import { mapSaleLine } from '../../../src/modules/sales/sales.mapper';
import { mapCashOut } from '../../../src/modules/cash-outs/cash-outs.mapper';
import { mapCountEntry } from '../../../src/modules/cash-ups/cash-ups.mapper';
import type { SaleLineDto } from '../../../src/modules/sales/sales.types';
const date = new Date('2026-01-02T03:04:05.000Z');
describe('service DTO mappers', () => {
    it('formats cash-up decimals and timestamps as serializable values', () => {
        const dto = mapCashUp({
            number: 1,
            id: 'cash-up-id',
            businessId: 'business-id',
            membershipId: 'membership-id',
            status: 'OPEN',
            floatUsd: { toString: () => '10' },
            floatLbp: { toString: () => '2000.5' },
            referenceRate: { toString: () => '1.2' },
            openedAt: date,
            countStartedAt: date,
            closedAt: date,
            approvedAt: date,
            voidedAt: date,
            approvedById: null,
            selfApproved: false,
            returnReason: null,
            voidReason: null,
            expectedUsd: { toString: () => '1.5' },
            expectedLbp: { toString: () => '2' },
            countedUsd: { toString: () => '3' },
            countedLbp: { toString: () => '4' },
            gapUsd: { toString: () => '-1.5' },
            gapLbp: { toString: () => '2' },
        });
        expect(dto.floatUsd).toBe('10.00');
        expect(dto.floatLbp).toBe('2000.50');
        expect(dto.referenceRate).toBe('1.20');
        expect(dto.openedAt).toBe(date.toISOString());
        expect(dto.countStartedAt).toBe(date.toISOString());
        expect(dto.expectedUsd).toBe('1.50');
        expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
    });
    it('maps only the privacy-approved open summary fields', () => {
        const dto = mapOpenCashUpSummary({
            number: 1,
            id: 'cash-up-id',
            openedAt: date,
            membership: { user: { fullName: 'Staff Member' } },
            _count: { sales: 3, requests: 1 },
        });
        expect(dto).toEqual({
            number: 1,
            id: 'cash-up-id',
            openedAt: date.toISOString(),
            staffName: 'Staff Member',
            salesCount: 3,
            requestsCount: 1,
        });
        expect(Object.keys(dto).sort()).toEqual(['number', 'id', 'openedAt', 'staffName', 'salesCount', 'requestsCount'].sort());
    });
    it('maps sales, cash-outs, and count entries to strings and ISO dates', () => {
        const sale = mapSale({
            businessAmountLbp: '0.00',
            deliveryFeeLbp: '0.00',
            tipLbp: '0.00',
            discountLbp: '0.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            id: 'sale-id',
            cashUpId: 'cash-up-id',
            saleNumber: 1,
            status: 'DELIVERED',
            businessAmountUsd: { toString: () => '10' },
            deliveryFeeUsd: { toString: () => '0' },
            tipUsd: { toString: () => '1.5' },
            discountUsd: { toString: () => '0.5' },
            totalCollectedUsd: { toString: () => '10' },
            method: 'CASH',
            changeGivenLbp: { toString: () => '0.5' },
            clientNumber: 'private-number',
            note: null,
            amountDiffers: false,
            isEdited: false,
            deletionAwaiting: false,
            createdAt: date,
            deliveredAt: date,
            deletedAt: date,
            cancelReason: null,
        });
        expect(sale.businessAmountUsd).toBe('10.00');
        expect(sale.tipUsd).toBe('1.50');
        expect(sale.discountUsd).toBe('0.50');
        expect(sale.changeGivenLbp).toBe('0.50');
        expect(sale.createdAt).toBe(date.toISOString());
        expect(sale.deletedAt).toBe(date.toISOString());
        expect(mapCashOut({
            amountLbp: '0.00',
            note: null,
            id: 'cash-out-id',
            cashUpId: 'cash-up-id',
            amountUsd: { toString: () => '2' },
            reason: 'Fuel',
            createdAt: date,
            updatedAt: date,
        }).amountUsd).toBe('2.00');
        expect(mapCountEntry({
            id: 'count-id',
            cashUpId: 'cash-up-id',
            currency: 'LBP',
            denomination: { toString: () => '1000' },
            quantity: 3,
            updatedAt: date,
        }).denomination).toBe('1000.00');
    });
    it.each([
        ['DELIVERED', 'COLLECTED', '10.00', null],
        ['TO_DELIVER', 'NOT_YET', null, '10.00'],
        ['DELETED', 'CANCELLED', null, null],
    ] as const)('maps %s money-taken state without presenting expected money as collected', (status, moneyTaken, amountCollected, amountExpected) => {
        const sale = mapSaleLine({
            businessAmountLbp: '0.00',
            deliveryFeeLbp: '0.00',
            tipLbp: status === 'TO_DELIVER' ? null : '0.00',
            discountLbp: '0.00',
            totalCollectedLbp: status === 'TO_DELIVER' ? null : '0.00',
            changeGivenLbp: status === 'TO_DELIVER' ? null : '0.00',
            id: 'sale-id',
            cashUpId: 'cash-up-id',
            saleNumber: 1,
            status,
            businessAmountUsd: { toString: () => '8' },
            deliveryFeeUsd: { toString: () => '2' },
            tipUsd: status === 'TO_DELIVER' ? null : '0.00',
            discountUsd: '0.00',
            totalCollectedUsd: status === 'TO_DELIVER' ? null : { toString: () => '10' },
            method: status === 'TO_DELIVER' ? null : 'CASH',
            changeGivenUsd: status === 'TO_DELIVER' ? null : '0.00',
            clientNumber: null,
            note: null,
            amountDiffers: false,
            isEdited: false,
            deletionAwaiting: false,
            createdAt: date,
            deliveredAt: status === 'DELIVERED' ? date : null,
            deletedAt: status === 'DELETED' ? date : null,
            cancelReason: status === 'DELETED' ? 'Cancelled' : null,
        });
        expect(sale.id).toBe('sale-id');
        const expected: Pick<SaleLineDto, 'moneyTaken' | 'totalCollectedUsd' | 'totalCollectedLbp'> = { moneyTaken, totalCollectedUsd: status === 'TO_DELIVER' ? null : '10.00', totalCollectedLbp: status === 'TO_DELIVER' ? null : '0.00' };
        void amountCollected;
        void amountExpected;
        expect(sale).toMatchObject(expected);
        if (status === 'TO_DELIVER') expect(sale).toMatchObject({ method: null, tipUsd: null, tipLbp: null, changeGivenUsd: null, changeGivenLbp: null });
    });
});
