import type { CashUp, CashUpDetail, CashUpSummary } from "@/types/driver/cash-up";

/** Everything the driver screens read. The real and the mock source both follow this list. */
export type DriverDataSource = {
    /** The driver's open cash-up (a returned one counts as open), or null when there is none. */
    getOpenCashUp(): Promise<CashUp | null>;
    /** The driver's own cash-ups, newest first. */
    getHistory(): Promise<CashUpSummary[]>;
    /** One of the driver's own locked cash-ups, or null when there is nothing to show (the page shows 404). */
    getCashUpDetail(id: string): Promise<CashUpDetail | null>;
};
