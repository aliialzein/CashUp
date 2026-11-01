export const CURRENCIES = ['USD', 'LBP'] as const;
export const PAYMENT_METHODS = ['CASH', 'WHISH', 'OMT'] as const;
export const CREATE_SALE_STATUSES = ['DELIVERED', 'TO_DELIVER'] as const;
export const SALE_STATUSES = ['TO_DELIVER', 'DELIVERED', 'DELETED'] as const;

export const DENOMINATIONS = {
  USD: ['1', '2', '5', '10', '20', '50', '100'],
  LBP: ['1000', '5000', '10000', '20000', '50000', '100000'],
} as const;

export const MAX_AMOUNT = { USD: '1000000.00', LBP: '100000000000.00' } as const;
export const REFERENCE_RATE_MAX = '10000000.00';
export const MAX_COUNT_QUANTITY = 100000;
export const MAX_COUNT_LINES = 50;

export const CLIENT_NUMBER_PATTERN = /^\+?\d{6,15}$/;
export const REASON_LENGTH = { min: 3, max: 200 } as const;
export const NOTE_MAX = 500;
export const PAGE_SIZE = { default: 30, max: 100 } as const;
export const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

export type Currency = (typeof CURRENCIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CreateSaleStatus = (typeof CREATE_SALE_STATUSES)[number];
export type SaleStatus = (typeof SALE_STATUSES)[number];
export type WalletMethod = Exclude<PaymentMethod, 'CASH'>;
export type Denomination = (typeof DENOMINATIONS)[Currency][number];
