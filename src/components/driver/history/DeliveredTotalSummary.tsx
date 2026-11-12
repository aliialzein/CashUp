import { formatNumber, type Amounts, type Currency } from "@/lib/format/money";

type DeliveredTotalSummaryProps = {
    /** e.g. "Delivered · 3" */
    label: string;
    total: Amounts;
};

/** A big number with its small currency code after it. */
function Amount({ value, currency }: { value: string; currency: Currency }) {
    return (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-mono text-xl font-semibold tracking-tight">{formatNumber(value, currency)}</span>
            <span className="text-xs font-medium text-muted">{currency}</span>
        </span>
    );
}

/** Phone only: a soft green card. The label on top, then USD and LBP at the two ends of one row. */
export function DeliveredTotalSummary({ label, total }: DeliveredTotalSummaryProps) {
    return (
        <section
            aria-label={label}
            className="mt-1 flex flex-col gap-2.5 rounded-xl border border-success-line bg-success-bg px-4 py-3 md:hidden"
        >
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <span aria-hidden className="size-2 rounded-full bg-emerald-600" />
                {label}
            </p>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <Amount value={total.usd} currency="USD" />
                <Amount value={total.lbp} currency="LBP" />
            </div>
        </section>
    );
}
