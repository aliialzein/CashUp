import { checkSaleBalance, assertDiscountWithinDue } from '../../../src/domain/money/sale-balance';
import { D, MoneyError } from '../../../src/domain/money/money';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
const base = createSaleSchema.parse({
    status: 'DELIVERED',
    businessAmountUsd: '10',
    deliveryFeeUsd: '2',
    totalCollectedUsd: '12',
    method: 'CASH'
});
describe('currency pair sale balance', () => {
    it('balances USD, LBP and both currencies independently', () => {
        expect(checkSaleBalance(base).balanced).toBe(true);
        expect(checkSaleBalance({
            ...base,
            businessAmountUsd: '0',
            deliveryFeeUsd: '0',
            totalCollectedUsd: '0',
            businessAmountLbp: '1000',
            totalCollectedLbp: '1000'
        }).balanced).toBe(true);
        expect(checkSaleBalance({ ...base, businessAmountLbp: '1000', totalCollectedLbp: '1000' }).balanced).toBe(true);
        expect(checkSaleBalance({ ...base, totalCollectedUsd: '11.99' }).USD.difference).toBe('-0.01');
        expect(checkSaleBalance({ ...base, totalCollectedUsd: '12.01' }).balanced).toBe(false);
        expect(checkSaleBalance({ ...base, totalCollectedUsd: '12.01' }).requiresReferenceRate).toBe(false);
    });
    it('keeps tips, discounts and change in their own currency', () => {
        const result = checkSaleBalance({
            ...base,
            tipUsd: '1',
            discountUsd: '2',
            totalCollectedUsd: '11',
            totalCollectedLbp: '1000',
            changeGivenLbp: '1000'
        });
        expect(result.balanced).toBe(true);
        expect(result.USD.due).toBe('11.00');
        expect(result.LBP.effectiveChange).toBe('1000.00');
        expect(checkSaleBalance({ ...base, changeGivenLbp: '1000' }).LBP.difference).toBe('-1000.00');
    });
    it('balances mixed-currency change only at the cash-up reference rate', () => {
        const mixed = {
            ...base,
            totalCollectedUsd: '20',
            changeGivenUsd: '5',
            changeGivenLbp: '268500',
        };
        expect(checkSaleBalance(mixed).balanced).toBe(false);
        expect(checkSaleBalance(mixed).requiresReferenceRate).toBe(true);
        expect(checkSaleBalance(mixed, '89500').balanced).toBe(true);
        expect(checkSaleBalance({ ...mixed, changeGivenLbp: '270000' }, '89500').balanced).toBe(false);
    });
    it('compares converted USD residuals exactly without implicit cent rounding', () => {
        const fractional = {
            ...base,
            businessAmountUsd: '0.01',
            deliveryFeeUsd: '0',
            tipUsd: '0',
            discountUsd: '0',
            totalCollectedUsd: '1.02',
            changeGivenUsd: '1',
            changeGivenLbp: '895',
        };
        expect(checkSaleBalance(fractional, '89500').balanced).toBe(true);
        expect(checkSaleBalance(fractional, '89500.5').balanced).toBe(false);
        expect(checkSaleBalance({
            ...fractional,
            changeGivenLbp: '895.01',
        }, '89501.5').balanced).toBe(false);
    });
    it('rejects negative due and handles large amounts', () => {
        expect(() => checkSaleBalance({ ...base, discountUsd: '13' })).toThrow(MoneyError);
        expect(() => checkSaleBalance(base, '0')).toThrow(MoneyError);
        expect(() => assertDiscountWithinDue(new D('-0.01'))).toThrow(MoneyError);
        expect(() => assertDiscountWithinDue('0')).not.toThrow();
        expect(checkSaleBalance({
            ...base,
            businessAmountLbp: '99999999999.99',
            deliveryFeeLbp: '0.01',
            totalCollectedLbp: '100000000000'
        }).balanced).toBe(true);
    });
});
