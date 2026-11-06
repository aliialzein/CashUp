import type { CashUpDetail } from "@/types/driver/cash-up";

/** "Approved 26 Oct, 09:10 by Ali" once reviewed, otherwise when it was submitted. */
export function detailSubtitle({ status, submittedAt, review }: CashUpDetail): string {
    if (status === "APPROVED" && review) return `Approved ${review.at} by ${review.by}`;
    return `Submitted ${submittedAt}`;
}
