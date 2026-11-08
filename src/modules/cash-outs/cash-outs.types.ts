export type CashOutStatus = 'ACTIVE' | 'CANCELLED';
export interface CashOutDto {
    readonly id: string;
    readonly cashUpId: string;
    readonly amountUsd: string;
    readonly amountLbp: string;
    readonly note: string | null;
    readonly reason: string;
    readonly status: CashOutStatus;
    readonly cancelReason: string | null;
    readonly cancelledAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface CashOutCreateResultDto {
    readonly cashOut: CashOutDto;
    readonly replayed: boolean;
}

/** Operation command; the UUID key is duplicate protection, never identity. */
export type CreateCashOutCommand = import('./cash-outs.validation').CreateCashOut & { readonly idempotencyKey: string };
