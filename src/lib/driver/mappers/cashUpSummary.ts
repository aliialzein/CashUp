import type { CashUpSummary } from "@/types/driver/cash-up";
import { formatDay, formatIsoDay } from "./businessTime";
import { toStatus, type CashUpInput } from "./cashUp";
import { pair } from "./sale";

/** What the backend sends for one row of the cash-up list. */
export type CashUpSummaryInput = Pick<CashUpInput, "id" | "number" | "status" | "returnReason" | "openedAt"> & {
    salesCount: number;
    gapUsd: string | null;
    gapLbp: string | null;
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
