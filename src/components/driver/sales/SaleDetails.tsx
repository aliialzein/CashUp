import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { keptAmounts } from "@/lib/driver/sales/collected";
import { saleTotalLabel } from "@/lib/driver/sales/saleLabels";
import type { Sale } from "@/types/driver/cash-up";
import { AmountLines, saleDetailGroups } from "./SaleDetailGroups";

type RowProps = {
    label: string;
    strong?: boolean;
    /** Numbers use the mono font. Words (a date, a method) do not. */
    mono?: boolean;
    children: ReactNode;
};

function Row({ label, strong = false, mono = true, children }: RowProps) {
    return (
        <div className={`flex items-baseline justify-between gap-3 text-[13px] ${strong ? "font-semibold" : ""}`}>
            <span className={strong ? "" : "text-muted"}>{label}</span>
            <span className={`text-right ${mono ? "font-mono" : ""}`}>{children}</span>
        </div>
    );
}

type SaleDetailsProps = {
    sale: Sale;
    id?: string;
    className?: string;
    /** Desktop already shows the client in the table row. */
    showClient?: boolean;
    /** More space between the rows. */
    roomy?: boolean;
};

/**
 * Phone: how a delivered sale worked out. The same ORDER and PAYMENT groups as the desktop row, as label/value rows,
 * then the total: "Kept" for cash, "Received by Whish/OMT" for a wallet.
 */
export function SaleDetails({ sale, id, className = "", showClient = true, roomy = false }: SaleDetailsProps) {
    const hasFlags = sale.isEdited || sale.amountDiffers;
    const gap = roomy ? "gap-3.5" : "gap-2";

    return (
        <div id={id} className={`flex flex-col ${gap} ${className}`}>
            {showClient && <Row label="Client">{sale.clientPhone || "Shop sale"}</Row>}
            {saleDetailGroups(sale).map((group) => (
                <div key={group.title} className={`flex flex-col ${gap}`}>
                    <h3 className="pt-1 text-xs font-medium tracking-wider text-muted uppercase">{group.title}</h3>
                    {group.items.map((item) => (
                        <Row key={item.label} label={item.label} mono={item.mono}>
                            {item.value}
                        </Row>
                    ))}
                </div>
            ))}
            {sale.note && (
                <div className="text-[13px]">
                    <span className="text-muted">Note</span>
                    <p className="mt-0.5">{sale.note}</p>
                </div>
            )}
            <div className="flex flex-col gap-2 border-t border-subtle pt-2">
                <Row label={saleTotalLabel(sale.method)} strong>
                    <AmountLines amounts={keptAmounts(sale)} />
                </Row>
                {hasFlags && (
                    <div className="flex flex-wrap gap-1.5">
                        {sale.isEdited && <Badge tone="info">Edited</Badge>}
                        {sale.amountDiffers && <Badge tone="warning">Amount differs</Badge>}
                    </div>
                )}
            </div>
        </div>
    );
}
