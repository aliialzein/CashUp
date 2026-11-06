import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { collectedAmounts } from "@/lib/driver/sales/collected";
import type { Sale } from "@/types/driver/cash-up";
import { AmountOrNone, hasAmounts, METHOD_LABEL } from "./SaleDetails";

const NONE: Amounts = { usd: "0", lbp: "0" };

type CellProps = {
    label: string;
    /** Numbers use the mono font. Words (a date, a method) do not. */
    mono?: boolean;
    children: ReactNode;
};

function Cell({ label, mono = true, children }: CellProps) {
    return (
        <div className={`flex min-w-fit ${mono ? "flex-[2_1_0%]" : "flex-[1_1_0%]"} flex-col gap-1 px-6 first:pl-0`}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`text-[13px] font-medium whitespace-nowrap ${mono ? "font-mono" : ""}`}>{children}</dd>
        </div>
    );
}

type SaleDetailsCellsProps = {
    sale: Sale;
    id?: string;
};

/**
 * Desktop: how a delivered sale worked out, as small cells in a row. The client is already in the table row.
 * The negative margins cancel the table's panel padding, so the green bar sits on the panel's edge.
 */
export function SaleDetailsCells({ sale, id }: SaleDetailsCellsProps) {
    const hasFlags = sale.isEdited || sale.amountDiffers;

    return (
        <div id={id} className="-mx-5 -mt-3 -mb-4 flex flex-col gap-4 border-l-4 border-success px-5 pt-3 pb-4">
            <dl className="flex flex-wrap gap-y-4 divide-x-2 divide-line">
                <Cell label="Date" mono={false}>
                    {[sale.date, sale.time].filter(Boolean).join(" · ")}
                </Cell>
                {sale.method && (
                    <Cell label="Paid by" mono={false}>
                        {METHOD_LABEL[sale.method]}
                    </Cell>
                )}
                <Cell label="Order amount">{formatAmounts(sale.amount)}</Cell>
                <Cell label="Delivery fee">
                    <AmountOrNone amounts={sale.deliveryFee ?? NONE} />
                </Cell>
                {hasAmounts(sale.tip) && <Cell label="Tip">{formatAmounts(sale.tip)}</Cell>}
                {hasAmounts(sale.discount) && <Cell label="Discount">{formatAmounts(sale.discount)}</Cell>}
                <Cell label="Change given">
                    <AmountOrNone amounts={sale.changeGiven ?? NONE} />
                </Cell>
            </dl>

            {sale.note && (
                <p className="text-[13px]">
                    <span className="text-muted">Note · </span>
                    {sale.note}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-subtle pt-3">
                <span className="text-[13px] font-semibold">Total collected</span>
                <span className="font-mono text-[13px] font-semibold">{formatAmounts(collectedAmounts(sale))}</span>
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
