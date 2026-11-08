import type { PaymentMethod, SaleStatus } from '../../generated/prisma/enums';
export interface SaleDto {
    readonly id: string;
    readonly cashUpId: string;
    readonly saleNumber: number;
    readonly status: SaleStatus;
    readonly businessAmountUsd: string;
    readonly businessAmountLbp: string;
    readonly deliveryFeeUsd: string;
    readonly deliveryFeeLbp: string;
    readonly tipUsd: string;
    readonly tipLbp: string;
    readonly discountUsd: string;
    readonly discountLbp: string;
    readonly totalCollectedUsd: string;
    readonly totalCollectedLbp: string;
    readonly method: PaymentMethod;
    readonly changeGivenUsd: string;
    readonly changeGivenLbp: string;
    readonly clientNumber: string | null;
    readonly note: string | null;
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
    readonly totalCollectedUsd: string;
    readonly totalCollectedLbp: string;
    readonly method: PaymentMethod;
    readonly changeGivenUsd: string;
    readonly changeGivenLbp: string;
    readonly businessAmountUsd: string;
    readonly businessAmountLbp: string;
    readonly deliveryFeeUsd: string;
    readonly deliveryFeeLbp: string;
    readonly tipUsd: string;
    readonly tipLbp: string;
    readonly discountUsd: string;
    readonly discountLbp: string;
    readonly clientNumber: string | null;
    readonly note: string | null;
    readonly createdAt: string;
    readonly deliveredAt: string | null;
    readonly cancelReason: string | null;
    readonly isEdited: boolean;
    readonly amountDiffers: boolean;
    readonly deletionAwaiting: boolean;
}
export interface SalesSummaryDto {
    readonly total: number;
    readonly delivered: number;
    readonly toDeliver: number;
    readonly deleted: number;
}
export interface SaleMutationDto {
    readonly saleId: string;
    readonly sale: SaleLineDto;
    readonly salesSummary: SalesSummaryDto;
}
export interface SaleCreateResultDto extends SaleMutationDto {
    readonly replayed: boolean;
}

/** Operation command; the UUID key is duplicate protection, never identity. */
export type CreateSaleCommand = import('./sales.validation').CreateSale & { readonly idempotencyKey: string };
