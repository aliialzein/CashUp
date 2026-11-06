export type LockedSalesTotal = "summary" | "tagged" | "toggle" | "row";

/**
 * The "Delivered" total at the top of a locked cash-up's sales on phone. All stay built: change this one word.
 * "summary": a soft green card, a dot and "Delivered · 3", then USD and LBP as big numbers at the two ends.
 * "tagged": "Delivered · 3" as a tag on the top border, the amounts inside.
 * "toggle": folded to a label and a chevron; USD and LBP open on separate lines.
 * "row": the label and both amounts on one line, as before.
 */
export const LOCKED_SALES_TOTAL = "summary" as LockedSalesTotal;
