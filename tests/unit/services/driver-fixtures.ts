import { Prisma, type CashUp, type Sale, type CashOut, type CountEntry } from '../../../src/generated/prisma/client';
import type { SaleTotalsRow } from '../../../src/modules/sales/sales.repository';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
export const date = new Date('2026-11-01T10:00:00.000Z');
export const actor: CurrentMember = { userId: 'user', businessId: 'business', membershipId: 'member', role: 'STAFF', };
const money = (value = '0') => new Prisma.Decimal(value);
export function cashUp(values: Partial<CashUp> = {}): CashUp {
    return {
        id: '10000000-0000-4000-8000-000000000001', businessId: 'business', membershipId: 'member', number: 7, status: 'OPEN',
        floatUsd: money('20'), floatLbp: money('1000'), referenceRate: null,
        openedAt: date, countStartedAt: null, closedAt: null, approvedAt: null, voidedAt: null, updatedAt: date,
        approvedById: null, selfApproved: false, returnReason: null, voidReason: null, lastSaleNumber: 0,
        expectedUsd: null, expectedLbp: null, countedUsd: null, countedLbp: null, gapUsd: null, gapLbp: null, ...values
    };
}
export function sale(values: Partial<Sale> = {}): Sale {
    return {
        id: 'sale', businessId: 'business', cashUpId: '10000000-0000-4000-8000-000000000001', saleNumber: 1, status: 'DELIVERED',
        businessAmountUsd: money('10'), businessAmountLbp: money(), deliveryFeeUsd: money('2'), deliveryFeeLbp: money(),
        tipUsd: money(), tipLbp: money(), discountUsd: money(), discountLbp: money(),
        totalCollectedUsd: money('12'), totalCollectedLbp: money('3000'), changeGivenUsd: money('1'), changeGivenLbp: money('100'),
        legacyPendingPayment: null,
        method: 'CASH', clientNumber: null, note: null, amountDiffers: false, isEdited: false, deletionAwaiting: false,
        cancelReason: null, idempotencyKey: null, createdAt: date, updatedAt: date, deliveredAt: date, deletedAt: null, ...values
    };
}
export function cashOut(values: Partial<CashOut> = {}): CashOut {
    return {
        id: 'expense', cashUpId: '10000000-0000-4000-8000-000000000001', amountUsd: money('2'), amountLbp: money('200'), reason: 'Fuel', note: null,
        status: 'ACTIVE', cancelReason: null, cancelledAt: null, cancelledByMembershipId: null, idempotencyKey: null,
        createdAt: date, updatedAt: date, ...values
    };
}
export function count(values: Partial<CountEntry> = {}): CountEntry {
    return { id: 'count', cashUpId: '10000000-0000-4000-8000-000000000001', currency: 'USD', denomination: money('5'), quantity: 0, updatedAt: date, ...values };
}
export function deliveredTotals(sales: readonly Sale[]): SaleTotalsRow[] {
    return sales.filter(row => row.status === 'DELIVERED').flatMap(row => (['USD', 'LBP'] as const).map(currency => {
        const suffix = currency === 'USD' ? 'Usd' : 'Lbp';
        return {
            currency, method: row.method!, count: 1, businessAmount: row[`businessAmount${suffix}`], deliveryFee: row[`deliveryFee${suffix}`],
            totalCollected: row[`totalCollected${suffix}`]!, tip: row[`tip${suffix}`]!, discount: row[`discount${suffix}`]
        };
    }));
}
