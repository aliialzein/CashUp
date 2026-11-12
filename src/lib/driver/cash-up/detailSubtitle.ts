import type { CashUpDetail } from "@/types/driver/cash-up";

/** "Approved 26 Oct, 09:10 by Owner" once approved, otherwise when it was submitted. Never the owner's name. */
export function detailSubtitle({ status, submittedAt, review }: CashUpDetail): string {
    if (status === "APPROVED" && review) return `Approved ${review.at} by Owner`;
    return `Submitted ${submittedAt}`;
}
