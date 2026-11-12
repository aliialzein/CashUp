import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CountBadge from "@/components/ui/CountBadge";
import SectionHeading from "@/components/ui/SectionHeading";
import { routes } from "@/lib/routes";

export default function DoneSection({ approvedCount }: { approvedCount: number }) {
  return (
    <div className="space-y-3">
      <SectionHeading title="DONE" />

      <Link
        href={routes.owner.cashUps}
        className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:bg-subtle sm:p-5"
      >
        <div className="space-y-1">
          <h3 className="font-semibold text-ink">Approved cash-ups</h3>
          <p className="text-sm text-muted">Locked and final</p>
        </div>

        <div className="flex items-center gap-3">
          <CountBadge count={approvedCount} variant="success" />
          <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
        </div>
      </Link>
    </div>
  );
}
