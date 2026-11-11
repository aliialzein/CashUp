import { Badge } from "@/components/ui/Badge";
import { keptAmounts } from "@/lib/driver/sales/collected";
import { saleTotalLabel } from "@/lib/driver/sales/saleLabels";
import { formatAmounts } from "@/lib/format/money";
import type { Sale } from "@/types/driver/cash-up";
import { saleDetailGroups } from "./SaleDetailGroups";

type SaleDetailsCellsProps = {
    sale: Sale;
    id?: string;
};

/**
 * Desktop: how a delivered sale worked out. ORDER and PAYMENT each fill one row of the same 4 columns, so the values
 * line up and nothing wraps; then the note, then the total ("Kept" for cash, "Received by Whish/OMT" for a wallet).
 * The client is already in the table row.
 * The negative margins cancel the table's panel padding, so the green bar sits on the panel's edge.
 */
export function SaleDetailsCells({ sale, id }: SaleDetailsCellsProps) {
    const hasFlags = sale.isEdited || sale.amountDiffers;

    return (
        <div id={id} className="-mx-5 -mt-3 -mb-4 flex flex-col gap-4 border-l-4 border-success px-5 pt-3 pb-4">
            {saleDetailGroups(sale).map((group) => (
                <div key={group.title} className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium tracking-wider text-muted uppercase">{group.title}</h3>
                    <dl className="grid grid-cols-4 gap-x-6">
                        {group.items.map((item) => (
                            <div key={item.label} className="flex min-w-0 flex-col gap-1">
                                <dt className="text-xs text-muted">{item.label}</dt>
                                <dd className={`text-[13px] font-medium whitespace-nowrap ${item.mono ? "font-mono" : ""}`}>
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}

            {sale.note && (
                <p className="text-[13px]">
                    <span className="text-muted">Note · </span>
                    {sale.note}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-subtle pt-3">
                <span className="text-[13px] font-semibold">{saleTotalLabel(sale.method)}</span>
                <span className="font-mono text-[13px] font-semibold">{formatAmounts(keptAmounts(sale))}</span>
                {hasFlags && (
                    <div className="ml-auto flex gap-1.5">
                        {sale.isEdited && <Badge tone="info">Edited</Badge>}
                        {sale.amountDiffers && <Badge tone="warning">Amount differs</Badge>}
                    </div>
                )}
            </div>
        </div>
    );
}
