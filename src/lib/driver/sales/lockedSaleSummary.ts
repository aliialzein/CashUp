export type LockedSaleSummary = "compact" | "toggle" | "none";

/**
 * How a delivered sale in a locked cash-up (History) looks on phone. All stay built: change this one word.
 * "compact": a "Show details" button, and the client number and date only live inside it.
 * "toggle": the same button, and the card header keeps the client number and time.
 * "none": the card as it was, with no button.
 */
export const LOCKED_SALE_SUMMARY = "compact" as LockedSaleSummary;
