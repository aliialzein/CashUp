import { parseReasonText } from "@/lib/driver/cash-out/reasonText";
import type { CashOutDto } from "@/modules/cash-outs/cash-outs.types";
import type { CashOut } from "@/types/driver/cash-up";
import { formatTime } from "./businessTime";
import { pair } from "./sale";

/**
 * The fields of the backend cash-out that the screens need. Taken from CashOutDto, so a backend rename
 * is a compile error here. `reason` is free text on the backend (format in reasonText.ts); `status` CANCELLED means soft-deleted.
 */
export type CashOutInput = Pick<
    CashOutDto,
    "id" | "amountUsd" | "amountLbp" | "reason" | "note" | "status" | "cancelReason" | "createdAt"
>;

export function mapCashOut(dto: CashOutInput): CashOut {
    const { reason, detail } = parseReasonText(dto.reason);
    const cashOut: CashOut = {
        id: dto.id,
        reason,
        time: formatTime(dto.createdAt),
        amount: pair(dto.amountUsd, dto.amountLbp),
        isDeleted: dto.status === "CANCELLED",
    };
    if (detail !== undefined) cashOut.detail = detail;
    if (dto.note !== null) cashOut.note = dto.note;
    if (dto.cancelReason !== null) cashOut.cancelReason = dto.cancelReason;
    return cashOut;
}
