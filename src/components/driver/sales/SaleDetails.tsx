import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { isZeroAmounts } from "@/lib/money/amounts";
import { collectedAmounts } from "@/lib/driver/sales/collected";
import type { Sale } from "@/types/cash-up";

const NONE: Amounts = { usd: "0", lbp: "0" };

export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: "Cash", WHISH: "Whish", OMT: "OMT" };

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

/** True when there is an amount worth showing. */
export function hasAmounts(amounts: Amounts | undefined): amounts is Amounts {
    return amounts !== undefined && !isZeroAmounts(amounts);
}

/** An amount, or a muted "None" when there is nothing. */
export function AmountOrNone({ amounts }: { amounts: Amounts }) {
    return isZeroAmounts(amounts) ? <span className="text-muted">None</span> : <>{formatAmounts(amounts)}</>;
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

/** How a delivered sale worked out. Phone and desktop show the same rows. */
export function SaleDetails({ sale, id, className = "", showClient = true, roomy = false }: SaleDetailsProps) {
    const hasFlags = sale.isEdited || sale.amountDiffers;

    return (
        <div id={id} className={`flex flex-col ${roomy ? "gap-3.5" : "gap-2"} ${className}`}>
            {showClient && <Row label="Client">{sale.clientPhone || "Shop sale"}</Row>}
            <Row label="Date" mono={false}>
                {[sale.date, sale.time].filter(Boolean).join(" · ")}
            </Row>
            {sale.method && (
                <Row label="Paid by" mono={false}>
                    {METHOD_LABEL[sale.method]}
                </Row>
            )}
            <Row label="Order amount">{formatAmounts(sale.amount)}</Row>
            <Row label="Delivery fee">
                <AmountOrNone amounts={sale.deliveryFee ?? NONE} />
            </Row>
            {hasAmounts(sale.tip) && <Row label="Tip">{formatAmounts(sale.tip)}</Row>}
            {hasAmounts(sale.discount) && <Row label="Discount">{formatAmounts(sale.discount)}</Row>}
            <Row label="Change given">
                <AmountOrNone amounts={sale.changeGiven ?? NONE} />
            </Row>
            {sale.note && (
                <div className="text-[13px]">
                    <span className="text-muted">Note</span>
                    <p className="mt-0.5">{sale.note}</p>
                </div>
            )}
            <div className="flex flex-col gap-2 border-t border-subtle pt-2">
                <Row label="Total collected" strong>
                    {formatAmounts(collectedAmounts(sale))}
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
