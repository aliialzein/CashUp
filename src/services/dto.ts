import type { CashUpStatus, Currency, PaymentMethod, SaleStatus } from '../persistence';
import type { ExpectedGap, CurrencySalesSummary } from '../domain/money';

export interface CashUpDto {
  readonly id: string;
  readonly status: CashUpStatus;
  readonly floatUsd: string;
  readonly floatLbp: string;
  readonly referenceRate: string | null;
  readonly openedAt: string;
  readonly countStartedAt: string | null;
  readonly closedAt: string | null;
  readonly approvedAt: string | null;
  readonly voidedAt: string | null;
  readonly approvedById: string | null;
  readonly selfApproved: boolean;
  readonly returnReason: string | null;
  readonly voidReason: string | null;
  readonly expectedUsd: string | null;
  readonly expectedLbp: string | null;
  readonly countedUsd: string | null;
  readonly countedLbp: string | null;
  readonly gapUsd: string | null;
  readonly gapLbp: string | null;
}

export interface OpenCashUpSummaryDto {
  readonly id: string;
  readonly openedAt: string;
  readonly staffName: string;
  readonly salesCount: number;
  readonly requestsCount: number;
}

export interface SaleDto {
  readonly id: string;
  readonly cashUpId: string;
  readonly saleNumber: number;
  readonly status: SaleStatus;
  readonly businessAmount: string;
  readonly deliveryFee: string;
  readonly tip: string | null;
  readonly discount: string | null;
  readonly totalCollected: string;
  readonly currency: Currency;
  readonly method: PaymentMethod;
  readonly changeGiven: string | null;
  readonly changeCurrency: Currency | null;
  readonly clientNumber: string | null;
  readonly note: string | null;
  readonly mixedChange: boolean;
  readonly amountDiffers: boolean;
  readonly isEdited: boolean;
  readonly deletionAwaiting: boolean;
  readonly createdAt: string;
  readonly deliveredAt: string | null;
  readonly deletedAt: string | null;
  readonly cancelReason: string | null;
}

export interface SaleLineDto {
  readonly id: string;
  readonly saleNumber: number;
  readonly status: SaleStatus;
  readonly moneyTaken: 'COLLECTED' | 'NOT_YET' | 'CANCELLED';
  readonly amountCollected: string | null;
  readonly amountExpected: string | null;
  readonly currency: Currency;
  readonly method: PaymentMethod;
  readonly changeGiven: string | null;
  readonly changeCurrency: Currency | null;
  readonly businessAmount: string;
  readonly deliveryFee: string;
  readonly tip: string | null;
  readonly discount: string | null;
  readonly clientNumber: string | null;
  readonly note: string | null;
  readonly createdAt: string;
  readonly deliveredAt: string | null;
  readonly cancelReason: string | null;
  readonly isEdited: boolean;
  readonly amountDiffers: boolean;
  readonly mixedChange: boolean;
  readonly deletionAwaiting: boolean;
}

export interface SalesSummaryDto {
  readonly total: number;
  readonly delivered: number;
  readonly toDeliver: number;
  readonly deleted: number;
}

export interface CashUpWithSalesDto extends CashUpDto {
  readonly sales: readonly SaleLineDto[];
  readonly salesSummary: SalesSummaryDto;
}

export type CashOutStatus = 'ACTIVE' | 'CANCELLED';

export interface CashOutDto {
  readonly id: string;
  readonly cashUpId: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly reason: string;
  readonly status: CashOutStatus;
  readonly cancelReason: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CashUpOwnDto extends CashUpWithSalesDto {
  readonly cashOuts: readonly CashOutDto[];
}

export interface CountDto {
  readonly cashUpId: string;
  readonly lines: readonly {
    readonly currency: Currency;
    readonly denomination: string;
    readonly quantity: number;
  }[];
  readonly countedTotals: Record<Currency, string>;
}

export interface SaleMutationDto {
  readonly saleId: string;
  readonly sale: SaleLineDto;
  readonly salesSummary: SalesSummaryDto;
}

export interface SaleCreateResultDto extends SaleMutationDto {
  readonly replayed: boolean;
}

export interface CashOutCreateResultDto {
  readonly cashOut: CashOutDto;
  readonly replayed: boolean;
}

export interface CountEntryDto {
  readonly id: string;
  readonly cashUpId: string;
  readonly currency: Currency;
  readonly denomination: string;
  readonly quantity: number;
  readonly updatedAt: string;
}

export interface CashUpReviewDto extends CashUpWithSalesDto {
  readonly cashOuts: readonly CashOutDto[];
  readonly countEntries: readonly CountEntryDto[];
  readonly salesByCurrency: Record<Currency, CurrencySalesSummary>;
  readonly walletTotals: Record<'WHISH' | 'OMT', Record<Currency, string>>;
  readonly expectedAndGap: Record<Currency, ExpectedGap>;
  readonly flags: {
    readonly total: number;
    readonly deleted: number;
    readonly edited: number;
    readonly amountDiffers: number;
    readonly mixedChange: number;
    readonly deletionAwaiting: number;
  };
}
