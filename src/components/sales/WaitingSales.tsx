import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatMoney } from "@/lib/format/money";
import { routes } from "@/lib/routes";
import type { Sale } from "@/types/cash-up";

/** Sales the driver has taken but not yet delivered. Nothing shows when there are none. */
export function WaitingSales({ sales }: { sales: Sale[] }) {
    if (sales.length === 0) return null;

    return (
        <section>
            <SectionLabel>Waiting for delivery · {sales.length}</SectionLabel>
            <ul className="space-y-3">
                {sales.map((sale) => (
                    <li
                        key={sale.id}
                        className="flex items-center gap-4 rounded-xl border border-warning-line bg-surface px-5 py-4"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="font-heading text-[17px] font-semibold">Sale #{sale.number}</p>
                            <p className="mt-0.5 font-mono text-[13px] whitespace-nowrap text-muted">{sale.clientPhone}</p>
                        </div>
                        <div className="text-right font-mono text-sm font-semibold tabular-nums">
                            <p>{formatMoney(sale.amount.usd, "USD")}</p>
                            <p>{formatMoney(sale.amount.lbp, "LBP")}</p>
                        </div>
                        <div className="w-44 shrink-0">
                            <ButtonLink href={routes.driver.completeDelivery(sale.id)} variant="secondary">
                                Complete delivery
                            </ButtonLink>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
