import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/driver/cash-out/reasons";
import type { CashOut } from "@/types/driver/cash-up";
import { formatTime } from "./businessTime";
import { pair } from "./sale";

/** What the backend sends for one cash-out. Swap for CashOutDto once the backend has pair columns. */
export type CashOutInput = {
    id: string;
    amountUsd: string;
    amountLbp: string;
    /** Free text on the backend. */
    reason: string;
    note: string | null;
    createdAt: string;
};

const FALLBACK_REASON: CashOutReason = "Other";

export function toCashOutReason(text: string): CashOutReason {
    return CASH_OUT_REASONS.find((knownReason) => knownReason === text) ?? FALLBACK_REASON;
}

export function mapCashOut(dto: CashOutInput): CashOut {
    const cashOut: CashOut = {
        id: dto.id,
        reason: toCashOutReason(dto.reason),
        time: formatTime(dto.createdAt),
        amount: pair(dto.amountUsd, dto.amountLbp),
    };
    if (dto.note !== null) cashOut.note = dto.note;
    return cashOut;
}
