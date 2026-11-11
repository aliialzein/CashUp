import type { ReactNode } from "react";
import { collectedAmounts } from "@/lib/driver/sales/collected";
import { CHANGE_GIVEN_LABEL, CLIENT_PAID_LABEL, METHOD_LABEL } from "@/lib/driver/sales/saleLabels";
import { formatMoney, type Amounts } from "@/lib/format/money";
import { isZeroAmounts } from "@/lib/money/amounts";
import type { Sale } from "@/types/driver/cash-up";

const NONE: Amounts = { usd: "0", lbp: "0" };

function NoneText() {
    return <span className="text-muted">None</span>;
}

/** USD on one line and LBP under it, so a long pair never breaks in the middle. "None" when both are zero. */
export function AmountLines({ amounts }: { amounts: Amounts }) {
    if (isZeroAmounts(amounts)) return <NoneText />;
    return (
        <span className="flex flex-col whitespace-nowrap">
            <span>{formatMoney(amounts.usd, "USD")}</span>
            <span>{formatMoney(amounts.lbp, "LBP")}</span>
        </span>
    );
}

export type SaleDetailItem = {
    label: string;
    value: ReactNode;
    /** Numbers use the mono font. Words (a date, a method) do not. */
    mono: boolean;
};

export type SaleDetailGroup = { title: string; items: SaleDetailItem[] };

/**
 * How a delivered sale worked out, in two fixed groups of four. Every item always shows (with "None" when empty),
 * so the phone rows and the desktop grid keep the same shape for every sale.
 */
export function saleDetailGroups(sale: Sale): SaleDetailGroup[] {
    return [
        {
            title: "Order",
            items: [
                { label: "Order amount", value: <AmountLines amounts={sale.amount} />, mono: true },
                { label: "Delivery fee", value: <AmountLines amounts={sale.deliveryFee ?? NONE} />, mono: true },
                { label: "Tip", value: <AmountLines amounts={sale.tip ?? NONE} />, mono: true },
                { label: "Discount", value: <AmountLines amounts={sale.discount ?? NONE} />, mono: true },
            ],
        },
        {
            title: "Payment",
            items: [
                { label: "Paid by", value: sale.method ? METHOD_LABEL[sale.method] : <NoneText />, mono: false },
                { label: "Date", value: [sale.date, sale.time].filter(Boolean).join(" · "), mono: false },
                { label: CLIENT_PAID_LABEL, value: <AmountLines amounts={collectedAmounts(sale)} />, mono: true },
                { label: CHANGE_GIVEN_LABEL, value: <AmountLines amounts={sale.changeGiven ?? NONE} />, mono: true },
            ],
        },
    ];
}
