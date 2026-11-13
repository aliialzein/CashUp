import type { OwnerCashUpSummaryDto } from "@/modules/cash-ups/cash-ups.types";
import Link from "next/link";
import { buttonVariantClasses } from "@/components/ui/driver/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import { routes } from "@/lib/routes";
import { ownerTime } from "../owner-format";

interface OpenNowProps {
  items: OwnerCashUpSummaryDto[];
}

export default function OpenNowSection({ items }: OpenNowProps) {
  return (
    <div className="space-y-3">
      <SectionHeading title="OPEN NOW" />

      <div className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-sm">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted sm:p-5">No driver has an open cash-up right now.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0 space-y-1">
                <h3 className="truncate font-semibold text-ink">{item.staffName}</h3>
                <p className="text-sm text-muted">
                  Since {ownerTime(item.openedAt)} · {item.salesCount} sale{item.salesCount === 1 ? "" : "s"}
                  {item.returnReason !== null && " · Returned"}
                </p>
              </div>
              <Link
                href={routes.owner.review(item.id)}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${buttonVariantClasses("secondary")}`}
              >
                Open
              </Link>
            </div>
          ))
        )}
      </div>

      <p className="px-1 text-xs text-muted">You see the amounts once they submit.</p>
    </div>
  );
}
