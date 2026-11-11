import type { CashUp, CashUpDetail, CashUpSummary, FloatSuggestion } from "@/types/driver/cash-up";

/** Who is signed in, as the driver header and Complete delivery need it. */
export type DriverIdentity = {
    businessName: string;
    userName: string;
    /** E.g. "Driver" in "Driver · Mohamad". */
    roleLabel: string;
    /** Complete delivery: whether the delivery fee must be entered. */
    feeRequired: boolean;
};

/** Everything the driver screens read. The real and the mock source both follow this list. */
export type DriverDataSource = {
    /** The driver's open cash-up (a returned one counts as open), or null when there is none. */
    getOpenCashUp(): Promise<CashUp | null>;
    /** The driver's own cash-ups, newest first. */
    getHistory(): Promise<CashUpSummary[]>;
    /** One of the driver's own locked cash-ups, or null when there is nothing to show (the page shows 404). */
    getCashUpDetail(id: string): Promise<CashUpDetail | null>;
    /** The signed-in member and their business. */
    getIdentity(): Promise<DriverIdentity>;
    /** The opening float Start cash-up suggests, or null for no suggestion. */
    getFloatSuggestion(): Promise<FloatSuggestion | null>;
};
