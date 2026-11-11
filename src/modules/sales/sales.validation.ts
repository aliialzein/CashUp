import { z } from 'zod';
import { CREATE_SALE_STATUSES, MONEY_PATTERN, SALE_STATUSES } from '../../domain/money/config';
import { add, compare, sub, type MoneyLike } from '../../domain/money/money';
import { addStableIssue, clientNumber, moneyString, note, paymentMethod } from '../../shared/validation/common';
import { addMaxIssue } from '../../shared/validation/financial';
import { reasonBody } from '../../shared/validation/financial';
const saleMoneyShape = {
  businessAmountUsd: moneyString.default('0.00'),
  businessAmountLbp: moneyString.default('0.00'),
  deliveryFeeUsd: moneyString.default('0.00'),
  deliveryFeeLbp: moneyString.default('0.00'),
  tipUsd: moneyString.default('0.00'),
  tipLbp: moneyString.default('0.00'),
  discountUsd: moneyString.default('0.00'),
  discountLbp: moneyString.default('0.00'),
  totalCollectedUsd: moneyString.default('0.00'),
  totalCollectedLbp: moneyString.default('0.00'),
  changeGivenUsd: moneyString.default('0.00'),
  changeGivenLbp: moneyString.default('0.00'),
};
const moneyFields = Object.keys(saleMoneyShape) as (keyof typeof saleMoneyShape)[];
function refineAmounts(value: Partial<Record<keyof typeof saleMoneyShape, string>>, context: z.RefinementCtx) {
  for (const field of moneyFields)
    addMaxIssue(context, field, value[field], field.endsWith('Usd') ? 'USD' : 'LBP');
}
function refineSaleFinancial(value: z.infer<typeof saleFinancialBase>, context: z.RefinementCtx) {
  refineAmounts(value, context);
  if (moneyFields.some(field => !MONEY_PATTERN.test(value[field])))
    return;
  if (compare(value.businessAmountUsd, '0') <= 0 && compare(value.businessAmountLbp, '0') <= 0)
    addStableIssue(context, 'BUSINESS_AMOUNT_MUST_BE_POSITIVE', ['businessAmountUsd']);
  for (const suffix of ['Usd', 'Lbp'] as const) {
    const due = sub(add(add(value[`businessAmount${suffix}`], value[`deliveryFee${suffix}`]), value[`tip${suffix}`]), value[`discount${suffix}`]);
    if (compare(due, '0') < 0)
      addStableIssue(context, 'DISCOUNT_EXCEEDS_DUE', [`discount${suffix}`]);
  }
}
const saleFinancialBase = z.object({
  ...saleMoneyShape,
  method: paymentMethod,
  clientNumber: clientNumber.nullable().optional(),
  note: note.nullable().optional(),
}).strict();
const saleFinancialSchema = saleFinancialBase.superRefine(refineSaleFinancial);
export const createSaleSchema = saleFinancialBase.extend({ status: z.enum(CREATE_SALE_STATUSES) }).strict().superRefine((value, context) => {
  refineSaleFinancial(value, context);
  if (value.status === 'TO_DELIVER' && !value.clientNumber)
    addStableIssue(context, 'CLIENT_NUMBER_REQUIRED', ['clientNumber']);
});
export const editSaleSchema = z.object({
  businessAmountUsd: moneyString.optional(),
  businessAmountLbp: moneyString.optional(),
  deliveryFeeUsd: moneyString.optional(),
  deliveryFeeLbp: moneyString.optional(),
  tipUsd: moneyString.optional(),
  tipLbp: moneyString.optional(),
  discountUsd: moneyString.optional(),
  discountLbp: moneyString.optional(),
  totalCollectedUsd: moneyString.optional(),
  totalCollectedLbp: moneyString.optional(),
  changeGivenUsd: moneyString.optional(),
  changeGivenLbp: moneyString.optional(),
  method: paymentMethod.optional(),
  clientNumber: clientNumber.nullable().optional(),
  note: note.nullable().optional(),
}).strict().superRefine((value, context) => {
  if (!Object.values(value).some(entry => entry !== undefined))
    addStableIssue(context, 'EDIT_FIELD_REQUIRED', []);
  refineAmounts(value, context);
});
export type MergedSaleCurrent = {
  [K in keyof typeof saleMoneyShape]: MoneyLike;
} & {
  status?: 'TO_DELIVER' | 'DELIVERED' | 'DELETED';
  method: 'CASH' | 'WHISH' | 'OMT';
  clientNumber?: string | null;
  note?: string | null;
};
export function validateMergedSale(current: MergedSaleCurrent, changes: EditSaleInput) {
  const merged = Object.fromEntries(moneyFields.map(field => [field, (changes[field] ?? current[field]).toString()]));
  return saleFinancialSchema.superRefine((value, context) => {
    if (current.status === 'TO_DELIVER' && !value.clientNumber)
      addStableIssue(context, 'CLIENT_NUMBER_REQUIRED', ['clientNumber']);
  }).safeParse({
    ...merged,
    method: changes.method ?? current.method,
    clientNumber: changes.clientNumber === undefined ? current.clientNumber : changes.clientNumber,
    note: changes.note === undefined ? current.note : changes.note
  });
}
export const cancelSaleSchema = reasonBody;
export const requestDeleteSaleSchema = reasonBody;
const statuses = z.preprocess((value: unknown) => {
  if (typeof value === 'string')
    return value.split(',').flatMap((part) => part.split(','));
  if (Array.isArray(value)) {
    return value.flatMap((entry) => typeof entry === 'string' ? entry.split(',') : [entry]);
  }
  return value;
}, z.array(z.enum(SALE_STATUSES)).optional());
const partialClientNumber = z
  .string()
  .transform((value) => value.trim())
  .pipe(z
    .string()
    .regex(/^\+?\d{1,15}$/, { error: 'INVALID_CLIENT_NUMBER' })
    .refine((value) => value.length <= 15, { error: 'INVALID_CLIENT_NUMBER' }));
export const listSalesQuerySchema = z
  .object({
    statuses,
    clientNumber: partialClientNumber.optional(),
  })
  .strict();
export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CreateSale = z.infer<typeof createSaleSchema>;
export type EditSaleInput = z.input<typeof editSaleSchema>;
export type EditSale = z.infer<typeof editSaleSchema>;
export type CancelSaleInput = z.input<typeof cancelSaleSchema>;
export type CancelSale = z.infer<typeof cancelSaleSchema>;
export type RequestDeleteSaleInput = z.input<typeof requestDeleteSaleSchema>;
export type RequestDeleteSale = z.infer<typeof requestDeleteSaleSchema>;
export type ListSalesQueryInput = z.input<typeof listSalesQuerySchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export const confirmDeliverySchema = z.object({
  totalCollectedUsd: moneyString.default('0.00'),
  totalCollectedLbp: moneyString.default('0.00'),
  changeGivenUsd: moneyString.default('0.00'),
  changeGivenLbp: moneyString.default('0.00'),
  method: paymentMethod,
}).strict().superRefine(refineAmounts);
export type ConfirmDeliveryInput = z.input<typeof confirmDeliverySchema>;
export type ConfirmDelivery = z.infer<typeof confirmDeliverySchema>;
