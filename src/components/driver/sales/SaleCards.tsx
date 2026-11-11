import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button, buttonVariantClasses } from "@/components/ui/driver/Button";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts } from "@/lib/format/money";
import { withOrigin, type Origin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import { saleAmountLine } from "@/lib/driver/sales/collected";
import type { Sale } from "@/types/driver/cash-up";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { SaleSummary } from "./SaleSummary";

type SaleCardsProps = {
    sales: Sale[];
    /** The page the driver is on, so Complete delivery and Edit can come back to it. Leave it out for a read-only list. */
    origin?: Origin;
    /** Delivered sales get a "Show details" button that opens the full summary. */
    expandable?: boolean;
    /** With `expandable`: a delivered sale's header drops the client number and time. They live in the summary. */
    compactHeader?: boolean;
    /** Only for the open cash-up: a trash button on "to deliver" sales. */
    onDelete?: (sale: Sale) => void;
    /** Only for the open cash-up: delivered sales are locked and get "Request deletion". */
    onRequestDeletion?: (sale: Sale) => void;
};

/** Phone: the sales as cards. A sale waiting for delivery has an amber border and a Complete delivery button. */
export function SaleCards({ sales, origin, expandable = false, compactHeader = false, onDelete, onRequestDeletion }: SaleCardsProps) {
    return (
        <ul className="space-y-2.5">
            {sales.map((sale) => {
                const waiting = sale.status === "TO_DELIVER";
                const deleted = sale.status === "DELETED";
                const lockedInOpenCashUp = sale.status === "DELIVERED" && onRequestDeletion !== undefined;
                const hasSummary = expandable && sale.status === "DELIVERED";
                const hideWho = compactHeader && hasSummary;
                const { label, amounts } = saleAmountLine(sale);
                return (
                    <li
                        key={sale.id}
                        className={`space-y-2.5 rounded-xl border bg-surface px-4 py-3 ${waiting ? "border-warning-line" : "border-line"}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-heading text-[15px] font-semibold">Sale #{sale.number}</p>
                                {!hideWho && (
                                    <p className={`mt-0.5 text-[13px] text-muted ${sale.clientPhone ? "font-mono" : ""}`}>
                                        {sale.clientPhone || "Shop sale"} · {sale.time}
                                    </p>
                                )}
                            </div>
                            <span className="flex items-center gap-1.5">
                                {lockedInOpenCashUp && (
                                    <span role="img" aria-label="Locked" className="text-muted">
                                        <Icon name="lock" size={14} />
                                    </span>
                                )}
                                <SaleStatusBadge status={sale.status} />
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-subtle pt-2.5">
                            <span className="text-xs font-medium tracking-wider text-muted uppercase">{label}</span>
                            <span className={`font-mono text-sm font-semibold ${deleted ? "text-muted line-through" : ""}`}>
                                {formatAmounts(amounts)}
                            </span>
                        </div>

                        {deleted && sale.cancelReason && (
                            <p className="text-[13px] wrap-break-word text-muted">Deleted · {sale.cancelReason}</p>
                        )}

                        {hasSummary && <SaleSummary sale={sale} />}

                        {waiting && origin && (
                            <>
                                <ButtonLink
                                    href={withOrigin(routes.driver.completeDelivery(sale.id), origin)}
                                    variant="secondary"
                                    className="gap-1.5"
                                >
                                    Complete delivery
                                    <Icon name="chevronRight" size={16} />
                                </ButtonLink>
                                <div className="flex gap-2.5">
                                    <div className="flex-1">
                                        <ButtonLink href={withOrigin(routes.driver.editSale(sale.id), origin)} variant="secondary">
                                            Edit
                                        </ButtonLink>
                                    </div>
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(sale)}
                                            aria-label={`Delete sale #${sale.number} ${formatAmounts(amounts)}`}
                                            className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl ${buttonVariantClasses("dangerOutline")}`}
                                        >
                                            <Icon name="trash" size={18} />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {lockedInOpenCashUp &&
                            (sale.deletionAwaiting ? (
                                <Badge tone="warning">Deletion requested</Badge>
                            ) : (
                                <Button variant="secondary" onClick={() => onRequestDeletion(sale)}>
                                    Request deletion
                                </Button>
                            ))}
                    </li>
                );
            })}
        </ul>
    );
}
