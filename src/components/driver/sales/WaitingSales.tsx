import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatMoney } from "@/lib/format/money";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import type { Sale } from "@/types/driver/cash-up";

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
                        className="flex flex-col gap-3 rounded-xl border border-warning-line bg-surface px-5 py-4 md:flex-row md:items-center md:gap-4"
                    >
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-4 md:items-center">
                            <div className="min-w-0">
                                <p className="font-heading text-[17px] font-semibold">Sale #{sale.number}</p>
                                <p className="mt-0.5 font-mono text-[13px] whitespace-nowrap text-muted">{sale.clientPhone}</p>
                            </div>
                            <div className="text-right font-mono text-sm font-semibold tabular-nums">
                                <p>{formatMoney(sale.amount.usd, "USD")}</p>
                                <p>{formatMoney(sale.amount.lbp, "LBP")}</p>
                            </div>
                        </div>
                        <div className="w-full md:w-44 md:shrink-0">
                            <ButtonLink href={withOrigin(routes.driver.completeDelivery(sale.id), "today")} variant="secondary">
                                Complete delivery
                            </ButtonLink>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
