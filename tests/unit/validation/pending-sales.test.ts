import { createSaleSchema, confirmDeliverySchema, validateMergedSale } from '../../../src/modules/sales/sales.validation';
const pending = { status: 'TO_DELIVER' as const, businessAmountUsd: '10', deliveryFeeUsd: '2', discountUsd: '1', clientNumber: '+961123456' };
const payment = { method: 'CASH' as const, totalCollectedUsd: '11', totalCollectedLbp: '0', changeGivenUsd: '0', changeGivenLbp: '0', tipUsd: '0', tipLbp: '0' };
const actual = ['method', 'totalCollectedUsd', 'totalCollectedLbp', 'changeGivenUsd', 'changeGivenLbp', 'tipUsd', 'tipLbp'] as const;
it('normalizes pending payment absence to null, retaining order money and text', () => {
  const result = createSaleSchema.parse({ ...pending, note: 'Call on arrival' });
  for (const field of actual) expect(result[field]).toBeNull();
  expect(result).toMatchObject({ businessAmountUsd: '10.00', deliveryFeeUsd: '2.00', discountUsd: '1.00', note: 'Call on arrival' });
  expect(validateMergedSale(result, { businessAmountUsd: '20', deliveryFeeUsd: '0', note: 'Changed' }).success).toBe(true);
  expect(validateMergedSale(result, { totalCollectedUsd: '0' }).success).toBe(false);
});
it.each(actual)('rejects actual %s even when supplied as zero on a pending order', field => {
  const parsed = createSaleSchema.safeParse({ ...pending, [field]: field === 'method' ? 'CASH' : '0' });
  expect(parsed.success).toBe(false);
  expect(parsed.error?.issues).toContainEqual(expect.objectContaining({ path: [field], message: 'PAYMENT_NOT_ALLOWED_FOR_PENDING_SALE' }));
});
it.each(actual)('requires explicit delivered payment field %s', field => {
  const input: Record<string, unknown> = { ...pending, ...payment, status: 'DELIVERED' };
  delete input[field];
  expect(createSaleSchema.safeParse(input).success).toBe(false);
  expect(confirmDeliverySchema.safeParse(Object.fromEntries(Object.entries(payment).filter(([key]) => key !== field))).success).toBe(false);
});
it('accepts explicit zero for unused currencies, change and tips; rejects invalid final fees/tips', () => {
  expect(createSaleSchema.safeParse({ ...pending, ...payment, status: 'DELIVERED' }).success).toBe(true);
  expect(confirmDeliverySchema.parse(payment).deliveryFeeUsd).toBeUndefined();
  expect(confirmDeliverySchema.parse({ ...payment, deliveryFeeUsd: '0' }).deliveryFeeUsd).toBe('0.00');
  for (const field of ['deliveryFeeUsd', 'deliveryFeeLbp', 'tipUsd', 'tipLbp'])
    for (const value of ['-1', '1.001', 'abc', '100000000001'])
      expect(confirmDeliverySchema.safeParse({ ...payment, [field]: value }).success).toBe(false);
});
