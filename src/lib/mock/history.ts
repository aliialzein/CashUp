import type { CashUpSummary } from "@/types/cash-up";
import { hasHistory } from "./scenarios";

/** Newest first. The gap is frozen when a cash-up is submitted. */
const allHistory: CashUpSummary[] = [
    { id: "c-43", number: 43, status: "OPEN", date: "28 Oct", salesCount: 3, gap: null },
    { id: "c-42", number: 42, status: "SUBMITTED", date: "27 Oct", salesCount: 3, gap: { usd: "0", lbp: "-10000" } },
    { id: "c-41", number: 41, status: "RETURNED", date: "26 Oct", salesCount: 4, gap: null },
    { id: "c-40", number: 40, status: "APPROVED", date: "25 Oct", salesCount: 5, gap: { usd: "0", lbp: "0" } },
    { id: "c-39", number: 39, status: "APPROVED", date: "24 Oct", salesCount: 2, gap: { usd: "-2", lbp: "0" } },
];

export const mockHistory: CashUpSummary[] = hasHistory ? allHistory : [];
