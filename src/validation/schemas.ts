import { z } from 'zod';
import {
  CREATE_SALE_STATUSES,
  DENOMINATIONS,
  MAX_AMOUNT,
  MAX_COUNT_LINES,
  MAX_COUNT_QUANTITY,
  REFERENCE_RATE_MAX,
  SALE_STATUSES,
  type Currency,
} from '../domain/money/config';
import { add, compare, sub, type MoneyLike } from '../domain/money/money';
import { checkSaleBalance } from '../domain/money/sale-balance';
import {
  addStableIssue,
  clientNumber,
  currency,
  idempotencyKey,
  moneyString,
  note,
  pageQuery,
  paymentMethod,
  positiveMoneyString,
  reason,
  uuid,
} from './common';

function addMaxIssue(
  context: z.RefinementCtx,
  field: string,
  amount: string | null | undefined,
  selectedCurrency: Currency | undefined,
): void {
  if (amount == null || selectedCurrency == null) return;
  if (compare(amount, MAX_AMOUNT[selectedCurrency]) > 0) {
    addStableIssue(context, 'AMOUNT_EXCEEDS_MAX', [field]);
  }
}

function validateChangePair(
  context: z.RefinementCtx,
  changeGiven: string | null | undefined,
  changeCurrency: Currency | null | undefined,
): void {
  if (changeGiven != null && changeCurrency == null) {
    addStableIssue(context, 'CHANGE_CURRENCY_REQUIRED', ['changeCurrency']);
  } else if (changeGiven == null && changeCurrency != null) {
    addStableIssue(context, 'CHANGE_AMOUNT_REQUIRED', ['changeGiven']);
  }
}

type SaleFinancialValues = {
  businessAmount: string;
  deliveryFee: string;
  tip?: string | null;
  discount?: string | null;
  totalCollected: string;
  currency: Currency;
  method: 'CASH' | 'WHISH' | 'OMT';
  changeGiven?: string | null;
  changeCurrency?: Currency | null;
  clientNumber?: string | null;
  note?: string | null;
};

function refineSaleFinancial(value: SaleFinancialValues, context: z.RefinementCtx): void {
  addMaxIssue(context, 'businessAmount', value.businessAmount, value.currency);
  addMaxIssue(context, 'deliveryFee', value.deliveryFee, value.currency);
  addMaxIssue(context, 'tip', value.tip, value.currency);
  addMaxIssue(context, 'discount', value.discount, value.currency);
  addMaxIssue(context, 'totalCollected', value.totalCollected, value.currency);
  addMaxIssue(context, 'changeGiven', value.changeGiven, value.changeCurrency ?? value.currency);
  validateChangePair(context, value.changeGiven, value.changeCurrency);

  const due = sub(
    add(add(value.businessAmount, value.deliveryFee), value.tip ?? '0.00'),
    value.discount ?? '0.00',
  );
  if (compare(due, '0') < 0) {
    addStableIssue(context, 'DISCOUNT_EXCEEDS_DUE', ['discount']);
    return;
  }

  if (!checkSaleBalance(value).balanced) {
    addStableIssue(context, 'SALE_NOT_BALANCED', ['totalCollected']);
  }
}

const saleFinancialSchema = z
  .object({
    businessAmount: moneyString,
    deliveryFee: moneyString,
    tip: moneyString.nullable().optional(),
    discount: moneyString.nullable().optional(),
    totalCollected: positiveMoneyString,
    currency,
    method: paymentMethod,
    changeGiven: positiveMoneyString.nullable().optional(),
    changeCurrency: currency.nullable().optional(),
    clientNumber: clientNumber.nullable().optional(),
    note: note.nullable().optional(),
  })
  .strict()
  .superRefine(refineSaleFinancial);

export const openCashUpSchema = z
  .object({
    floatUsd: moneyString.default('0.00'),
    floatLbp: moneyString.default('0.00'),
    referenceRate: positiveMoneyString.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    addMaxIssue(context, 'floatUsd', value.floatUsd, 'USD');
    addMaxIssue(context, 'floatLbp', value.floatLbp, 'LBP');
    if (
      value.referenceRate !== undefined &&
      compare(value.referenceRate, REFERENCE_RATE_MAX) > 0
    ) {
      addStableIssue(context, 'REFERENCE_RATE_EXCEEDS_MAX', ['referenceRate']);
    }
  });

export const createSaleSchema = z
  .object({
    ...saleFinancialSchema.shape,
    status: z.enum(CREATE_SALE_STATUSES),
    deliveryFee: moneyString.default('0.00'),
    clientNumber: clientNumber.optional(),
    note: note.optional(),
    idempotencyKey,
  })
  .strict()
  .superRefine((value, context) => {
    const financial = {
      businessAmount: value.businessAmount,
      deliveryFee: value.deliveryFee,
      tip: value.tip,
      discount: value.discount,
      totalCollected: value.totalCollected,
      currency: value.currency,
      method: value.method,
      changeGiven: value.changeGiven,
      changeCurrency: value.changeCurrency,
      clientNumber: value.clientNumber,
      note: value.note,
    };
    refineSaleFinancial(financial, context);
    if (value.status === 'TO_DELIVER' && !value.clientNumber) {
      addStableIssue(context, 'CLIENT_NUMBER_REQUIRED', ['clientNumber']);
    }
  });

const editMoneyField = moneyString.nullable().optional();
export const editSaleSchema = z
  .object({
    businessAmount: moneyString.optional(),
    deliveryFee: moneyString.optional(),
    tip: editMoneyField,
    discount: editMoneyField,
    totalCollected: positiveMoneyString.optional(),
    currency: currency.optional(),
    method: paymentMethod.optional(),
    changeGiven: positiveMoneyString.nullable().optional(),
    changeCurrency: currency.nullable().optional(),
    clientNumber: clientNumber.nullable().optional(),
    note: note.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!Object.values(value).some((entry) => entry !== undefined)) {
      addStableIssue(context, 'EDIT_FIELD_REQUIRED', []);
    }

    const selectedCurrency = value.currency;
    const fallbackCurrency: Currency = selectedCurrency ?? 'LBP';
    for (const field of [
      'businessAmount',
      'deliveryFee',
      'tip',
      'discount',
      'totalCollected',
    ] as const) {
      addMaxIssue(context, field, value[field], fallbackCurrency);
    }
    addMaxIssue(
      context,
      'changeGiven',
      value.changeGiven,
      value.changeCurrency ?? selectedCurrency ?? 'LBP',
    );
  });

export type MergedSaleCurrent = {
  businessAmount: MoneyLike;
  deliveryFee: MoneyLike;
  tip?: MoneyLike | null;
  discount?: MoneyLike | null;
  totalCollected: MoneyLike;
  currency: Currency;
  method: 'CASH' | 'WHISH' | 'OMT';
  changeGiven?: MoneyLike | null;
  changeCurrency?: Currency | null;
  clientNumber?: string | null;
  note?: string | null;
};

export function validateMergedSale(
  current: MergedSaleCurrent,
  changes: EditSaleInput,
) {
  return saleFinancialSchema.safeParse({
    businessAmount: changes.businessAmount ?? current.businessAmount,
    deliveryFee: changes.deliveryFee ?? current.deliveryFee,
    tip: changes.tip === undefined ? current.tip : changes.tip,
    discount: changes.discount === undefined ? current.discount : changes.discount,
    totalCollected:
      changes.totalCollected === undefined ? current.totalCollected : changes.totalCollected,
    currency: changes.currency ?? current.currency,
    method: changes.method ?? current.method,
    changeGiven:
      changes.changeGiven === undefined ? current.changeGiven : changes.changeGiven,
    changeCurrency:
      changes.changeCurrency === undefined
        ? current.changeCurrency
        : changes.changeCurrency,
    clientNumber:
      changes.clientNumber === undefined ? current.clientNumber : changes.clientNumber,
    note: changes.note === undefined ? current.note : changes.note,
  });
}

export const confirmDeliverySchema = z
  .object({
    totalCollected: positiveMoneyString,
    currency,
    method: paymentMethod,
    changeGiven: positiveMoneyString.optional(),
    changeCurrency: currency.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    addMaxIssue(context, 'totalCollected', value.totalCollected, value.currency);
    addMaxIssue(
      context,
      'changeGiven',
      value.changeGiven,
      value.changeCurrency ?? value.currency,
    );
    validateChangePair(context, value.changeGiven, value.changeCurrency);
  });

const reasonBody = z.object({ reason }).strict();
export const cancelSaleSchema = reasonBody;
export const requestDeleteSaleSchema = reasonBody;
export const requestVoidCashUpSchema = reasonBody;
export const voidCashUpSchema = reasonBody;
export const returnCashUpSchema = reasonBody;

export const createCashOutSchema = z
  .object({
    amount: positiveMoneyString,
    currency,
    reason,
    idempotencyKey,
  })
  .strict()
  .superRefine((value, context) => {
    addMaxIssue(context, 'amount', value.amount, value.currency);
  });

export const updateCashOutSchema = z
  .object({
    amount: positiveMoneyString.optional(),
    currency: currency.optional(),
    reason: reason.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!Object.values(value).some((entry) => entry !== undefined)) {
      addStableIssue(context, 'EDIT_FIELD_REQUIRED', []);
    }
    addMaxIssue(context, 'amount', value.amount, value.currency ?? 'LBP');
  });

const mergedCashOutSchema = z
  .object({
    amount: positiveMoneyString,
    currency,
    reason,
  })
  .strict()
  .superRefine((value, context) => {
    addMaxIssue(context, 'amount', value.amount, value.currency);
  });

export interface MergedCashOutCurrent {
  amount: MoneyLike;
  currency: Currency;
  reason: string;
}

export function validateMergedCashOut(
  current: MergedCashOutCurrent,
  changes: UpdateCashOutInput,
) {
  return mergedCashOutSchema.safeParse({
    amount: changes.amount ?? current.amount,
    currency: changes.currency ?? current.currency,
    reason: changes.reason ?? current.reason,
  });
}

const countLineSchema = z
  .object({
    currency,
    denomination: moneyString,
    quantity: z.number().int().min(0).max(MAX_COUNT_QUANTITY),
  })
  .strict()
  .superRefine((value, context) => {
    const allowed = DENOMINATIONS[value.currency].map((denomination) =>
      normalizeDenomination(denomination),
    );
    if (!allowed.includes(value.denomination)) {
      addStableIssue(context, 'INVALID_DENOMINATION', ['denomination']);
    }
  });

export const saveCountLinesSchema = z
  .object({
    lines: z.array(countLineSchema).min(1).max(MAX_COUNT_LINES),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.lines.forEach((line, index) => {
      const key = `${line.currency}:${line.denomination}`;
      if (seen.has(key)) {
        addStableIssue(context, 'DUPLICATE_COUNT_LINE', ['lines', index, 'denomination']);
      }
      seen.add(key);
    });
  });

function normalizeDenomination(value: string): string {
  return value.includes('.') ? value : `${value}.00`;
}

const statuses = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'string') return value.split(',').flatMap((part) => part.split(','));
    if (Array.isArray(value)) {
      return value.flatMap((entry) =>
        typeof entry === 'string' ? entry.split(',') : [entry],
      );
    }
    return value;
  },
  z.array(z.enum(SALE_STATUSES)).optional(),
);

const partialClientNumber = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .regex(/^\+?\d{1,15}$/, { error: 'INVALID_CLIENT_NUMBER' })
      .refine((value) => value.length <= 15, { error: 'INVALID_CLIENT_NUMBER' }),
  );

export const listSalesQuerySchema = z
  .object({
    statuses,
    clientNumber: partialClientNumber.optional(),
  })
  .strict();

export const AUDIT_ENTITY_TYPES = [
  'USER',
  'BUSINESS',
  'MEMBERSHIP',
  'JOIN_CODE',
  'CASH_UP',
  'SALE',
  'CASH_OUT',
  'COUNT_ENTRY',
  'REQUEST',
  'AMENDMENT',
] as const;

export const auditQuerySchema = pageQuery
  .extend({
    entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
    entityId: uuid.optional(),
  })
  .strict();

export const cashUpHistoryQuerySchema = pageQuery
  .extend({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    membershipId: uuid.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      addStableIssue(context, 'INVALID_DATE_RANGE', ['from']);
    }
  });

export type OpenCashUpInput = z.input<typeof openCashUpSchema>;
export type OpenCashUp = z.infer<typeof openCashUpSchema>;
export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CreateSale = z.infer<typeof createSaleSchema>;
export type EditSaleInput = z.input<typeof editSaleSchema>;
export type EditSale = z.infer<typeof editSaleSchema>;
export type ConfirmDeliveryInput = z.input<typeof confirmDeliverySchema>;
export type ConfirmDelivery = z.infer<typeof confirmDeliverySchema>;
export type CancelSaleInput = z.input<typeof cancelSaleSchema>;
export type CancelSale = z.infer<typeof cancelSaleSchema>;
export type RequestDeleteSaleInput = z.input<typeof requestDeleteSaleSchema>;
export type RequestDeleteSale = z.infer<typeof requestDeleteSaleSchema>;
export type RequestVoidCashUpInput = z.input<typeof requestVoidCashUpSchema>;
export type RequestVoidCashUp = z.infer<typeof requestVoidCashUpSchema>;
export type VoidCashUpInput = z.input<typeof voidCashUpSchema>;
export type VoidCashUp = z.infer<typeof voidCashUpSchema>;
export type ReturnCashUpInput = z.input<typeof returnCashUpSchema>;
export type ReturnCashUp = z.infer<typeof returnCashUpSchema>;
export type CreateCashOutInput = z.input<typeof createCashOutSchema>;
export type CreateCashOut = z.infer<typeof createCashOutSchema>;
export type UpdateCashOutInput = z.input<typeof updateCashOutSchema>;
export type UpdateCashOut = z.infer<typeof updateCashOutSchema>;
export type SaveCountLinesInput = z.input<typeof saveCountLinesSchema>;
export type SaveCountLines = z.infer<typeof saveCountLinesSchema>;
export type ListSalesQueryInput = z.input<typeof listSalesQuerySchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type AuditQueryInput = z.input<typeof auditQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type CashUpHistoryQueryInput = z.input<typeof cashUpHistoryQuerySchema>;
export type CashUpHistoryQuery = z.infer<typeof cashUpHistoryQuerySchema>;
