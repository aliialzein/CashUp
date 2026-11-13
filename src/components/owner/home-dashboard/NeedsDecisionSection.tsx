import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CountBadge from "@/components/ui/CountBadge";
import SectionHeading from "@/components/ui/SectionHeading";
import { routes } from "@/lib/routes";

interface NeedsDecisionProps {
  cashUpsCount: number;
  cashUpNames: string[];
  requestsCount: number;
}

const ROW = "flex min-h-16 items-center justify-between gap-4 p-4 transition hover:bg-subtle sm:p-5";

export default function NeedsDecisionSection({ cashUpsCount, cashUpNames, requestsCount }: NeedsDecisionProps) {
  return (
    <div className="space-y-3">
      <SectionHeading title="NEEDS YOUR DECISION" />

      <div className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-sm">
        <Link href={routes.owner.cashUps} className={ROW}>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-ink">Cash-ups to review</h3>
            <p className="truncate text-sm text-muted">
              {cashUpNames.length > 0 ? cashUpNames.join(", ") : "Nothing waiting"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CountBadge count={cashUpsCount} variant="info" />
            <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
          </div>
        </Link>

        <Link href={routes.owner.cashUps} className={ROW}>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-ink">Requests</h3>
            <p className="text-sm text-muted">
              {requestsCount > 0 ? "Drivers asked to delete a delivered sale" : "No requests waiting"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CountBadge count={requestsCount} variant="warning" />
            <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </div>
  );
}
