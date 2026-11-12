import type { CashUpHistoryRowDto } from "@/modules/cash-ups/cash-ups.types";
import type { CashUpSummary } from "@/types/driver/cash-up";
import { formatDay, formatIsoDay } from "./businessTime";
import { toStatus, type OwnCashUpStatus } from "./cashUp";
import { pair } from "./sale";

/** The fields of one backend history row that the list needs, taken from CashUpHistoryRowDto. VOID rows are dropped before this. */
export type CashUpSummaryInput = Pick<
    CashUpHistoryRowDto,
    "id" | "number" | "returnReason" | "openedAt" | "salesCount" | "gapUsd" | "gapLbp"
> & {
    status: OwnCashUpStatus;
};

export function mapCashUpSummary(dto: CashUpSummaryInput): CashUpSummary {
    const hasGap = dto.gapUsd !== null && dto.gapLbp !== null;
    const summary: CashUpSummary = {
        id: dto.id,
        number: dto.number,
        status: toStatus(dto),
        date: formatDay(dto.openedAt),
        isoDate: formatIsoDay(dto.openedAt),
        salesCount: dto.salesCount,
        gap: hasGap ? pair(dto.gapUsd ?? "0.00", dto.gapLbp ?? "0.00") : null,
    };
    if (dto.returnReason !== null) summary.returnReason = dto.returnReason;
    return summary;
}
