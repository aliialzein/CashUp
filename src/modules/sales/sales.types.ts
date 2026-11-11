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
    readonly tipUsd: string | null;
    readonly tipLbp: string | null;
    readonly discountUsd: string;
    readonly discountLbp: string;
    readonly totalCollectedUsd: string | null;
    readonly totalCollectedLbp: string | null;
    readonly method: PaymentMethod | null;
    readonly changeGivenUsd: string | null;
    readonly changeGivenLbp: string | null;
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
    readonly totalCollectedUsd: string | null;
    readonly totalCollectedLbp: string | null;
    readonly method: PaymentMethod | null;
    readonly changeGivenUsd: string | null;
    readonly changeGivenLbp: string | null;
    readonly businessAmountUsd: string;
    readonly businessAmountLbp: string;
    readonly deliveryFeeUsd: string;
    readonly deliveryFeeLbp: string;
    readonly tipUsd: string | null;
    readonly tipLbp: string | null;
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
export type CreateSaleCommand = import('./sales.validation').CreateSaleInput & { readonly idempotencyKey: string };

export interface SaleDeletionRequestDto {
    readonly id: string;
    readonly type: import('../../generated/prisma/enums').RequestType;
    readonly cashUpId: string;
    readonly saleId: string | null;
    readonly status: import('../../generated/prisma/enums').RequestStatus;
    readonly reason: string;
    readonly requestedById: string;
    readonly decidedById: string | null;
    readonly decisionReason: string | null;
    readonly selfApproved: boolean;
    readonly createdAt: string;
    readonly decidedAt: string | null;
}
export interface SaleDeletionResultDto extends SaleMutationDto {
    readonly request: SaleDeletionRequestDto;
}
