import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts } from "@/lib/format/money";
import { withOrigin, type Origin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import type { Sale } from "@/types/cash-up";
import { SaleStatusBadge } from "./SaleStatusBadge";

type SaleCardsProps = {
    sales: Sale[];
    /** The page the driver is on, so Complete delivery can come back to it. Leave it out for a read-only list. */
    origin?: Origin;
};

/** Phone: the sales as cards. A sale waiting for delivery has an amber border and a Complete delivery button. */
export function SaleCards({ sales, origin }: SaleCardsProps) {
    return (
        <ul className="space-y-2.5">
            {sales.map((sale) => {
                const waiting = sale.status === "TO_DELIVER";
                const deleted = sale.status === "DELETED";
                return (
                    <li
                        key={sale.id}
                        className={`space-y-2.5 rounded-xl border bg-surface px-4 py-3 ${waiting ? "border-warning-line" : "border-line"}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-heading text-[15px] font-semibold">Sale #{sale.number}</p>
                                <p className={`mt-0.5 text-[13px] text-muted ${sale.clientPhone ? "font-mono" : ""}`}>
                                    {sale.clientPhone || "Shop sale"} · {sale.time}
                                </p>
                            </div>
                            <SaleStatusBadge status={sale.status} />
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-subtle pt-2.5">
                            <span className="text-xs font-medium tracking-wider text-muted uppercase">
                                {waiting ? "To collect" : "Cash"}
                            </span>
                            <span className={`font-mono text-sm font-semibold ${deleted ? "text-muted line-through" : ""}`}>
                                {formatAmounts(sale.amount)}
                            </span>
                        </div>

                        {waiting && origin && (
                            <ButtonLink
                                href={withOrigin(routes.driver.completeDelivery(sale.id), origin)}
                                variant="secondary"
                                className="gap-1.5"
                            >
                                Complete delivery
                                <Icon name="chevronRight" size={16} />
                            </ButtonLink>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
