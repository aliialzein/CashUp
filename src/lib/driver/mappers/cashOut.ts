import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/driver/cash-out/reasons";
import type { CashOutDto } from "@/modules/cash-outs/cash-outs.types";
import type { CashOut } from "@/types/driver/cash-up";
import { formatTime } from "./businessTime";
import { pair } from "./sale";

/**
 * The fields of the backend cash-out that the screens need. Taken from CashOutDto, so a backend rename
 * is a compile error here. `reason` is free text on the backend; `status` CANCELLED means soft-deleted.
 */
export type CashOutInput = Pick<
    CashOutDto,
    "id" | "amountUsd" | "amountLbp" | "reason" | "note" | "status" | "cancelReason" | "createdAt"
>;

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
        isDeleted: dto.status === "CANCELLED",
    };
    if (dto.note !== null) cashOut.note = dto.note;
    if (dto.cancelReason !== null) cashOut.cancelReason = dto.cancelReason;
    return cashOut;
}
