import type { OwnerCashUpSummaryDto } from "@/modules/cash-ups/cash-ups.types";

/** The filter chips on the owner's Cash-ups page. */
export type CashUpFilter = "ALL" | "TO_REVIEW" | "REQUESTS" | "OPEN" | "RETURNED" | "APPROVED";

export const CASH_UP_FILTERS: readonly { id: CashUpFilter; label: string }[] = [
  { id: "TO_REVIEW", label: "To review" },
  { id: "REQUESTS", label: "Requests" },
  { id: "OPEN", label: "Open" },
  { id: "RETURNED", label: "Returned" },
  { id: "APPROVED", label: "Approved" },
  { id: "ALL", label: "All" },
];

/** The colour family of a status badge or next-step text. */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

/** A returned cash-up is OPEN again, with the owner's reason attached. */
export function isReturned(cashUp: OwnerCashUpSummaryDto): boolean {
  return cashUp.status === "OPEN" && cashUp.returnReason !== null;
}

/** A sale-deletion request this owner can still approve or refuse. */
export function hasWaitingRequest(cashUp: OwnerCashUpSummaryDto): boolean {
  return cashUp.requests.some((request) => request.canDecide);
}

export function matchesFilter(cashUp: OwnerCashUpSummaryDto, filter: CashUpFilter): boolean {
  switch (filter) {
    case "TO_REVIEW":
      return cashUp.status === "SUBMITTED";
    case "REQUESTS":
      return hasWaitingRequest(cashUp);
    case "OPEN":
      return cashUp.status === "OPEN" && !isReturned(cashUp);
    case "RETURNED":
      return isReturned(cashUp);
    case "APPROVED":
      return cashUp.status === "APPROVED";
    case "ALL":
      return true;
  }
}

/** The badge next to the cash-up number. */
export function statusBadge(cashUp: OwnerCashUpSummaryDto): { label: string; tone: Tone } {
  if (isReturned(cashUp)) return { label: "Returned", tone: "warning" };
  switch (cashUp.status) {
    case "OPEN":
      return { label: "Open", tone: "neutral" };
    case "SUBMITTED":
      return { label: "Submitted", tone: "info" };
    case "APPROVED":
      return { label: "Approved", tone: "success" };
    case "VOID":
      return { label: "Cancelled", tone: "neutral" };
  }
}

/** What the owner should do next, shown on the right of the card. */
export function nextStep(cashUp: OwnerCashUpSummaryDto): { label: string; tone: Tone } {
  if (hasWaitingRequest(cashUp)) return { label: "Decide on a request", tone: "warning" };
  if (cashUp.status === "SUBMITTED") {
    return cashUp.canReview ? { label: "Review", tone: "info" } : { label: "Waiting for review", tone: "neutral" };
  }
  if (isReturned(cashUp)) return { label: "With driver", tone: "warning" };
  if (cashUp.status === "OPEN") return { label: "In progress", tone: "neutral" };
  if (cashUp.status === "APPROVED") return { label: "Locked", tone: "success" };
  return { label: "Cancelled", tone: "neutral" };
}

/** Everything the owner's Home page shows, worked out from one list of cash-ups. */
export type OwnerHomeSummary = {
  toReview: OwnerCashUpSummaryDto[];
  waitingRequests: number;
  open: OwnerCashUpSummaryDto[];
  approvedCount: number;
};

export function summarizeOwnerHome(cashUps: readonly OwnerCashUpSummaryDto[]): OwnerHomeSummary {
  return {
    toReview: cashUps.filter((cashUp) => cashUp.status === "SUBMITTED" && cashUp.canReview),
    waitingRequests: cashUps.reduce(
      (total, cashUp) => total + cashUp.requests.filter((request) => request.canDecide).length,
      0,
    ),
    open: cashUps.filter((cashUp) => cashUp.status === "OPEN"),
    approvedCount: cashUps.filter((cashUp) => cashUp.status === "APPROVED").length,
  };
}
