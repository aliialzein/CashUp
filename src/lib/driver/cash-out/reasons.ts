export const CASH_OUT_REASONS = ["Fuel", "Supplier", "Change top-up", "Other"] as const;

export type CashOutReason = (typeof CASH_OUT_REASONS)[number];
