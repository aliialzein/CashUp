import { REASON_LENGTH } from "@/domain/money/config";
import { CASH_OUT_REASONS, type CashOutReason } from "./reasons";

/**
 * The backend keeps a cash-out reason as free text. The app writes it as:
 *   "Fuel", "Supplier", "Change top-up"  -> the category name only
 *   "Other: Car wash"                    -> "Other: " followed by what the driver typed
 * Reading it back, the category is the text before the first ": " (used by the filter chips),
 * and the rest is the detail (shown in the list). Text without a known category is Other, kept whole.
 */
const DETAIL_SEPARATOR = ": ";
const OTHER: CashOutReason = "Other";
const OTHER_PREFIX = `${OTHER}${DETAIL_SEPARATOR}`;

/** The longest detail that still fits the backend's reason limit after "Other: " (200 - 7 = 193). */
export const OTHER_DETAIL_MAX_LENGTH = REASON_LENGTH.max - OTHER_PREFIX.length;

/** A cash-out reason as the screens use it: the category, plus the driver's words if there are any. */
export type CashOutReasonParts = { reason: CashOutReason; detail?: string };

function isCashOutReason(text: string): text is CashOutReason {
    return CASH_OUT_REASONS.some((knownReason) => knownReason === text);
}

/**
 * Screen choice -> the backend reason text. `null` when it cannot be written: a category the app
 * does not know (anyone can call an action), or Other without a detail.
 */
export function toReasonText(reason: string, detail: string): string | null {
    if (!isCashOutReason(reason)) return null;
    if (reason !== OTHER) return reason;

    const trimmedDetail = detail.trim();
    return trimmedDetail === "" ? null : `${OTHER_PREFIX}${trimmedDetail}`;
}

/** The backend reason text -> category and detail. */
export function parseReasonText(text: string): CashOutReasonParts {
    const separatorAt = text.indexOf(DETAIL_SEPARATOR);
    const category = separatorAt === -1 ? text : text.slice(0, separatorAt);
    if (!isCashOutReason(category)) return { reason: OTHER, detail: text };

    const detail = separatorAt === -1 ? "" : text.slice(separatorAt + DETAIL_SEPARATOR.length);
    return detail === "" ? { reason: category } : { reason: category, detail };
}

/** What the list shows: "Fuel", or "Other: Car wash". */
export function cashOutReasonLabel({ reason, detail }: CashOutReasonParts): string {
    return detail === undefined ? reason : `${reason}${DETAIL_SEPARATOR}${detail}`;
}
