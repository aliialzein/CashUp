import { Badge } from "@/components/ui/Badge";
import { formatNumber, type Amounts, type Currency } from "@/lib/format/money";

type DeliveredTotalTaggedProps = {
    /** e.g. "Delivered · 3" */
    label: string;
    total: Amounts;
};

/** One currency: a small label above its amount. */
function Stat({ currency, value }: { currency: Currency; value: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-0.5 px-4">
            <dt className="text-xs font-medium tracking-wider text-muted uppercase">{currency}</dt>
            <dd className="truncate font-mono text-base font-semibold">{formatNumber(value, currency)}</dd>
        </div>
    );
}

/** Phone only: the label sits on the top border as a tag, and the two currencies share the card side by side. */
export function DeliveredTotalTagged({ label, total }: DeliveredTotalTaggedProps) {
    return (
        <div className="relative mt-3 rounded-xl border border-success-line bg-surface pt-5 pb-3 md:hidden">
            <span className="absolute -top-3 left-3">
                <Badge tone="success">{label}</Badge>
            </span>
            <dl className="grid grid-cols-2 divide-x divide-subtle">
                <Stat currency="USD" value={total.usd} />
                <Stat currency="LBP" value={total.lbp} />
            </dl>
        </div>
    );
}
