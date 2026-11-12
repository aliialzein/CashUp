import { gapStatus } from "@/lib/driver/count-cash/calculations";
import type { Amounts, Currency } from "@/lib/format/money";
import { formatNumber } from "@/lib/format/money";

export function GapPart({ currency, value }: { currency: Currency; value: string }) {
    const status = gapStatus(value);
    if (status === "match") return <span className="text-success">{currency} matches</span>;

    const sign = status === "over" ? "+" : "";
    return (
        <span className={status === "short" ? "text-danger" : "text-warning"}>
            {currency} {sign}
            {formatNumber(value, currency)}
        </span>
    );
}

/** "USD matches · LBP -10,000": counted minus expected, colored by status. */
export function GapText({ gap }: { gap: Amounts }) {
    return (
        <>
            <GapPart currency="USD" value={gap.usd} /> · <GapPart currency="LBP" value={gap.lbp} />
        </>
    );
}
