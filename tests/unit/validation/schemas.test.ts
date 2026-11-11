import { randomUUID } from 'node:crypto';
import { createBusinessSchema, createJoinCodeSchema, redeemJoinCodeSchema, replaceManagerSchema, setBusinessSoloSchema } from '../../../src/modules/business/business.validation';
import { auditQuerySchema } from '../../../src/modules/audit/audit.validation';
import { cancelSaleSchema, createSaleSchema, editSaleSchema, listSalesQuerySchema, requestDeleteSaleSchema, validateMergedSale } from '../../../src/modules/sales/sales.validation';
import { cashUpHistoryQuerySchema, openCashUpSchema, requestVoidCashUpSchema, returnCashUpSchema, saveCountLinesSchema, voidCashUpSchema } from '../../../src/modules/cash-ups/cash-ups.validation';
import { confirmDeliverySchema } from '../../../src/modules/sales/sales.validation';
import { createCashOutSchema, updateCashOutSchema, validateMergedCashOut } from '../../../src/modules/cash-outs/cash-outs.validation';
import { toValidationError } from '../../../src/shared/validation/errors';
import { checkSaleBalance } from '../../../src/domain/money/sale-balance';
const uuid = () => randomUUID();
const validSale = () => ({
    businessAmountLbp: '0.00',
    deliveryFeeUsd: '0.00',
    deliveryFeeLbp: '0.00',
    tipUsd: '0.00',
    tipLbp: '0.00',
    discountUsd: '0.00',
    discountLbp: '0.00',
    totalCollectedLbp: '0.00',
    changeGivenUsd: '0.00',
    changeGivenLbp: '0.00',
    status: 'DELIVERED',
    businessAmountUsd: '10',
    totalCollectedUsd: '10.00',
    method: 'CASH',
});
describe('common schema rules', () => {
    it('validates business setup schemas strictly and applies only documented defaults', () => {
        expect(createBusinessSchema.parse({ name: '  Corner shop  ' })).toEqual({
            name: 'Corner shop',
            isSolo: false,
        });
        expect(createBusinessSchema.safeParse({ name: 'Shop', role: 'OWNER' }).success).toBe(false);
        expect(createBusinessSchema.safeParse({ name: ' \n ' }).success).toBe(false);
        expect(setBusinessSoloSchema.safeParse({ isSolo: true, extra: true }).success).toBe(false);
        expect(replaceManagerSchema.safeParse({ memberId: uuid() }).success).toBe(true);
        expect(replaceManagerSchema.safeParse({ memberId: uuid(), userId: uuid() }).success).toBe(false);
        expect(createJoinCodeSchema.parse({})).toEqual({ maxUses: 1, expiresInDays: 7 });
        expect(createJoinCodeSchema.safeParse({ maxUses: 101 }).success).toBe(false);
        expect(createJoinCodeSchema.safeParse({ expiresInDays: 31 }).success).toBe(false);
        expect(redeemJoinCodeSchema.safeParse({ code: '23456789ABCD' }).success).toBe(true);
        expect(redeemJoinCodeSchema.safeParse({ code: '0123456789IO' }).success).toBe(false);
    });
    it('normalizes money, applies defaults, and validates reference-rate bounds', () => {
        expect(openCashUpSchema.parse({})).toEqual({
            floatUsd: '0.00',
            floatLbp: '0.00',
        });
        expect(openCashUpSchema.parse({
            floatUsd: '1000000.00',
            floatLbp: '100000000000',
            referenceRate: '10000000',
        })).toEqual({
            floatUsd: '1000000.00',
            floatLbp: '100000000000.00',
            referenceRate: '10000000.00',
        });
        expect(openCashUpSchema.safeParse({ floatUsd: '1000000.01' }).success).toBe(false);
        expect(openCashUpSchema.safeParse({ floatLbp: '100000000000.01' }).success).toBe(false);
        expect(openCashUpSchema.safeParse({ referenceRate: '0' }).success).toBe(false);
        expect(openCashUpSchema.safeParse({ referenceRate: '10000000.01' }).success).toBe(false);
        expect(openCashUpSchema.safeParse({ businessId: uuid() }).success).toBe(false);
    });
    it('trims text, bounds lengths, and rejects control characters', () => {
        expect(cancelSaleSchema.parse({ reason: '  Needs correction  ' }).reason).toBe('Needs correction');
        expect(cancelSaleSchema.safeParse({ reason: '  no ' }).success).toBe(false);
        expect(cancelSaleSchema.safeParse({ reason: `a${'x'.repeat(200)}` }).success).toBe(false);
        expect(cancelSaleSchema.safeParse({ reason: 'bad\nreason' }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), note: 'line 1\nline 2' }).success).toBe(true);
        expect(createSaleSchema.safeParse({ ...validSale(), note: `x${'a'.repeat(500)}` }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), note: 'bad\ttext' }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), clientNumber: ' +961123456 ' }).success).toBe(true);
        expect(createSaleSchema.safeParse({ ...validSale(), clientNumber: '+123' }).success).toBe(false);
    });
});
describe('pair financial validation', () => {
    it.each([
        { businessAmountUsd: '10', totalCollectedUsd: '10' },
        { businessAmountLbp: '1000', totalCollectedLbp: '1000' },
        {
            businessAmountUsd: '10',
            totalCollectedUsd: '10',
            businessAmountLbp: '1000',
            totalCollectedLbp: '1000'
        },
    ])('accepts independent pairs %j', pair => {
        const sale = createSaleSchema.parse({ status: 'DELIVERED', method: 'CASH', ...pair });
        expect(sale.tipUsd).toBe('0.00');
        expect(sale.discountLbp).toBe('0.00');
        expect(validateMergedSale(sale, { note: 'Updated note' }).success).toBe(true);
    });
    it('requires positive business money, balance, client number and currency-specific limits', () => {
        expect(createSaleSchema.safeParse({ status: 'DELIVERED', method: 'CASH' }).success).toBe(false);
        const unbalancedSale = createSaleSchema.parse({ ...validSale(), totalCollectedUsd: '9.99' });
        expect(checkSaleBalance(unbalancedSale).balanced).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), discountUsd: '11' }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), status: 'TO_DELIVER' }).success).toBe(false);
        const sale = createSaleSchema.parse({ ...validSale(), status: 'TO_DELIVER', clientNumber: '+961123456' });
        expect(validateMergedSale(sale, { clientNumber: null }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), businessAmountUsd: '1000000.01', totalCollectedUsd: '1000000.01' }).success).toBe(false);
        expect(createSaleSchema.safeParse({
            status: 'DELIVERED',
            method: 'CASH',
            businessAmountLbp: '100000000000',
            totalCollectedLbp: '100000000000'
        }).success).toBe(true);
        expect(editSaleSchema.safeParse({ businessAmountUsd: '1000000.01' }).success).toBe(false);
        expect(editSaleSchema.safeParse({}).success).toBe(false);
        expect(confirmDeliverySchema.safeParse({ totalCollectedLbp: '100000000000.01', method: 'CASH' }).success).toBe(false);
    });
    it.each(['businessAmount', 'deliveryFee', 'tip', 'discount', 'totalCollected', 'changeGiven'].flatMap(field => ['Usd', 'Lbp'].map(suffix => field + suffix)))('rejects malformed and negative %s without throwing', field => {
        for (const value of ['abc', '-1', '1.234', '1e2', '01', '', ' 1']) {
            expect(createSaleSchema.safeParse({ ...validSale(), [field]: value }).success).toBe(false);
            expect(editSaleSchema.safeParse({ [field]: value }).success).toBe(false);
            if (field.startsWith('totalCollected') || field.startsWith('changeGiven'))
                expect(confirmDeliverySchema.safeParse({ method: 'CASH', [field]: value }).success).toBe(false);
        }
    });
    it('rejects malformed float/rate and cash-out money without throwing', () => {
        for (const field of ['floatUsd', 'floatLbp', 'referenceRate'])
            expect(openCashUpSchema.safeParse({ [field]: 'abc' }).success).toBe(false);
        for (const field of ['amountUsd', 'amountLbp'])
            for (const value of ['abc', '-1', '1.234']) {
                expect(createCashOutSchema.safeParse({ reason: 'Fuel', [field]: value }).success).toBe(false);
                expect(updateCashOutSchema.safeParse({ [field]: value }).success).toBe(false);
            }
    });
    it('validates positive cash-out pairs and merged updates', () => {
        for (const pair of [{ amountUsd: '2' }, { amountLbp: '1000' }, { amountUsd: '2', amountLbp: '1000' }])
            expect(createCashOutSchema.safeParse({ ...pair, reason: 'Fuel', note: 'Diesel' }).success).toBe(true);
        expect(createCashOutSchema.safeParse({ amountUsd: '0', amountLbp: '0', reason: 'Fuel' }).success).toBe(false);
        expect(createCashOutSchema.safeParse({ amountUsd: '1000000.01', reason: 'Fuel' }).success).toBe(false);
        expect(createCashOutSchema.safeParse({ amountLbp: '100000000000.01', reason: 'Fuel' }).success).toBe(false);
        expect(updateCashOutSchema.safeParse({}).success).toBe(false);
        expect(validateMergedCashOut({ amountUsd: '1', amountLbp: '0', reason: 'Fuel' }, { amountUsd: '0' }).success).toBe(false);
        expect(validateMergedCashOut({ amountUsd: '1', amountLbp: '0', reason: 'Fuel' }, { amountLbp: '1000', note: 'Updated' }).success).toBe(true);
    });
});
describe('count and query schemas', () => {
    it('normalizes denominations, rejects duplicates, and bounds quantities', () => {
        expect(saveCountLinesSchema.parse({
            lines: [{ currency: 'USD', denomination: '100.00', quantity: 0 }],
        }).lines[0].denomination).toBe('100.00');
        expect(saveCountLinesSchema.safeParse({
            lines: [
                { currency: 'USD', denomination: '100', quantity: 1 },
                { currency: 'USD', denomination: '100.00', quantity: 2 },
            ],
        }).success).toBe(false);
        expect(saveCountLinesSchema.safeParse({
            lines: [{ currency: 'USD', denomination: '3', quantity: 1 }],
        }).success).toBe(false);
        for (const quantity of [-1, 1.5, 100001]) {
            expect(saveCountLinesSchema.safeParse({
                lines: [{ currency: 'LBP', denomination: '1000', quantity }],
            }).success).toBe(false);
        }
        expect(saveCountLinesSchema.safeParse({
            lines: [{ currency: 'LBP', denomination: '1000', quantity: 100000 }],
        }).success).toBe(true);
        for (const field of ['currency', 'denomination', 'quantity']) {
            const missing = { currency: 'USD', denomination: '1', quantity: 1 };
            delete missing[field as keyof typeof missing];
            expect(saveCountLinesSchema.safeParse({ lines: [missing] }).success).toBe(false);
        }
        expect(saveCountLinesSchema.safeParse({
            lines: Array.from({ length: 51 }, () => ({
                currency: 'USD',
                denomination: '1',
                quantity: 1,
            })),
        }).success).toBe(false);
        expect(saveCountLinesSchema.safeParse({ lines: [] }).success).toBe(true);
    });
    it('parses repeated and comma-separated statuses and bounds pagination', () => {
        expect(listSalesQuerySchema.parse({ statuses: ['DELIVERED', 'DELETED,TO_DELIVER'] }).statuses).toEqual(['DELIVERED', 'DELETED', 'TO_DELIVER']);
        expect(listSalesQuerySchema.parse({ statuses: 'DELIVERED,DELETED' }).statuses).toEqual([
            'DELIVERED',
            'DELETED',
        ]);
        expect(listSalesQuerySchema.safeParse({ clientNumber: '+1234567890123456' }).success).toBe(false);
        expect(listSalesQuerySchema.safeParse({ clientNumber: '+12345678901234' }).success).toBe(true);
        expect(listSalesQuerySchema.safeParse({ clientNumber: '+12345' }).success).toBe(true);
        expect(listSalesQuerySchema.safeParse({ statuses: 'BOGUS' }).success).toBe(false);
        expect(auditQuerySchema.parse({}).take).toBe(30);
        expect(auditQuerySchema.parse({ take: '100' }).take).toBe(100);
        expect(auditQuerySchema.safeParse({ take: '101' }).success).toBe(false);
        expect(auditQuerySchema.safeParse({ take: '0' }).success).toBe(false);
        expect(auditQuerySchema.safeParse({ cursorId: 'not-a-uuid' }).success).toBe(false);
        expect(auditQuerySchema.safeParse({ take: '1.5' }).success).toBe(false);
        expect(auditQuerySchema.safeParse({ take: 10 }).success).toBe(true);
        expect(auditQuerySchema.safeParse({ entityType: 'SALE' }).success).toBe(true);
        expect(auditQuerySchema.safeParse({ entityType: 'NOT_AUDIT_ENTITY' }).success).toBe(false);
        expect(listSalesQuerySchema.safeParse({ statuses: ['DELIVERED', 42] }).success).toBe(false);
        expect(cashUpHistoryQuerySchema.safeParse({
            from: '2026-02-02',
            to: '2026-02-01',
        }).success).toBe(false);
        expect(cashUpHistoryQuerySchema.safeParse({
            from: '2026-02-01',
            to: '2026-02-02',
            membershipId: uuid(),
        }).success).toBe(true);
    });
});
describe('strict body schemas and validation errors', () => {
    it('rejects server-controlled and unrecognized keys on every core request shape', () => {
        expect(openCashUpSchema.safeParse({ status: 'OPEN' }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), membershipId: uuid() }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), mixedChange: false }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), amountDiffers: false }).success).toBe(false);
        expect(createSaleSchema.safeParse({ ...validSale(), createdAt: 'now' }).success).toBe(false);
        expect(confirmDeliverySchema.safeParse({
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            totalCollectedUsd: '10',
            method: 'CASH',
            status: 'DELIVERED',
        }).success).toBe(false);
        expect(createCashOutSchema.safeParse({
            amountLbp: '0.00',
            note: null,
            amountUsd: '1',
            reason: 'Valid reason',
            idempotencyKey: uuid(),
            businessId: uuid(),
        }).success).toBe(false);
        expect(saveCountLinesSchema.safeParse({
            lines: [{ currency: 'USD', denomination: '1', quantity: 1, createdAt: 'now' }],
        }).success).toBe(false);
    });
    it.each([
        cancelSaleSchema,
        requestDeleteSaleSchema,
        requestVoidCashUpSchema,
        voidCashUpSchema,
        returnCashUpSchema,
    ])('accepts only a valid reason body', (schema) => {
        expect(schema.safeParse({ reason: 'Valid reason' }).success).toBe(true);
        expect(schema.safeParse({}).success).toBe(false);
        expect(schema.safeParse({ reason: 'Valid reason', status: 'OPEN' }).success).toBe(false);
    });
    it('reports paths and stable codes but never echoes submitted personal values', () => {
        const privateNumber = '+961123456';
        const result = createSaleSchema.safeParse({
            ...validSale(),
            clientNumber: privateNumber,
            businessAmountUsd: '1000000.01',
        });
        expect(result.success).toBe(false);
        if (result.success)
            return;
        const error = toValidationError(result.error);
        const serialized = JSON.stringify(error);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.issues).toContainEqual({
            path: ['businessAmountUsd'],
            code: 'AMOUNT_EXCEEDS_MAX',
        });
        expect(serialized).not.toContain(privateNumber);
        expect(serialized).not.toContain('1000000.01');
        expect(serialized).not.toContain('message');
        const uncustomized = openCashUpSchema.safeParse({ floatUsd: 4 }).error;
        expect(uncustomized).toBeDefined();
        expect(toValidationError(uncustomized!).issues[0].code).toBe('invalid_type');
    });
});
