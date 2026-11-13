import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import type { OwnerCashUpSummaryDto } from "@/modules/cash-ups/cash-ups.types";
import { nextStep, statusBadge } from "@/lib/owner/cashUpOverview";
import { routes } from "@/lib/routes";
import { ownerDate } from "../owner-format";
import { TONE_BADGE, TONE_TEXT } from "../tone";

/** One row of the owner's Cash-ups list. The whole card opens the review page. */
export default function CashUpCard({ cashUp }: { cashUp: OwnerCashUpSummaryDto }) {
  const badge = statusBadge(cashUp);
  const step = nextStep(cashUp);

  return (
    <Link
      href={routes.owner.review(cashUp.id)}
      className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-line-strong focus-visible:outline-2 focus-visible:outline-ink"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink">Cash-up #{cashUp.number}</h3>
          <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium ${TONE_BADGE[badge.tone]}`}>
            {cashUp.status === "APPROVED" && <Lock className="h-3 w-3" aria-hidden="true" />}
            {badge.label}
          </span>
        </div>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{cashUp.staffName}</span>
          <span aria-hidden="true">·</span>
          <span>{ownerDate(cashUp.openedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {cashUp.salesCount} sale{cashUp.salesCount === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-sm font-medium ${TONE_TEXT[step.tone]}`}>{step.label}</span>
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}
