import { Card } from "@/components/ui/Card";
import { gapStatus } from "@/lib/count-cash/calculations";
import { formatNumber, type Amounts, type Currency } from "@/lib/format/money";

const ROW = "grid grid-cols-[8rem_1fr_1.3fr] items-center gap-2 px-5";
const NUM = "text-right font-mono text-sm tabular-nums";

export function GapCell({ currency, value }: { currency: Currency; value: string }) {
    const status = gapStatus(value);
    if (status === "match") return <span className="text-success">Matches</span>;

    const sign = status === "over" ? "+" : "";
    return (
        <span className={status === "short" ? "text-danger" : "text-warning"}>
            {sign}
            {formatNumber(value, currency)}
        </span>
    );
}

/** What the driver counted when submitting, and the gap to the expected cash. One column per currency. */
export function CountResult({ counted, gap }: { counted: Amounts; gap: Amounts }) {
    return (
        <Card as="section" aria-label="Counted against expected" className="overflow-hidden">
            <div className={`${ROW} min-h-10 border-b border-line text-xs font-medium tracking-wider text-muted uppercase`}>
                <span>Count</span>
                <span className="text-right">USD</span>
                <span className="text-right">LBP</span>
            </div>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <span className="text-muted">Counted</span>
                <span className={NUM}>{formatNumber(counted.usd, "USD")}</span>
                <span className={NUM}>{formatNumber(counted.lbp, "LBP")}</span>
            </div>
            <div className={`${ROW} min-h-11 text-[15px]`}>
                <span className="font-semibold">Gap</span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="USD" value={gap.usd} />
                </span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="LBP" value={gap.lbp} />
                </span>
            </div>
        </Card>
    );
}
