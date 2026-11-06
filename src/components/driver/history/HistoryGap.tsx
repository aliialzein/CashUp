import { Fragment } from "react";
import { GapPart } from "@/components/driver/count-cash/GapText";
import { gapStatus } from "@/lib/driver/count-cash/calculations";
import type { Amounts, Currency } from "@/lib/format/money";
import type { CashUpStatus } from "@/types/driver/cash-up";

type HistoryGapProps = {
    status: CashUpStatus;
    gap: Amounts | null;
};

/** The last column of a History row: progress, a fix request, a match, or only the currencies that differ. */
export function HistoryGap({ status, gap }: HistoryGapProps) {
    if (status === "OPEN") return <span className="text-muted">In progress</span>;
    if (status === "RETURNED") return <span className="font-semibold text-warning">Fix needed</span>;
    if (gap === null) return <span className="text-muted">—</span>;

    const differences: { currency: Currency; value: string }[] = [
        { currency: "USD" as const, value: gap.usd },
        { currency: "LBP" as const, value: gap.lbp },
    ].filter(({ value }) => gapStatus(value) !== "match");

    if (differences.length === 0) return <span className="font-mono font-semibold text-success">Matches</span>;

    return (
        <span className="font-mono font-semibold">
            {differences.map(({ currency, value }, index) => (
                <Fragment key={currency}>
                    {index > 0 && " · "}
                    <GapPart currency={currency} value={value} />
                </Fragment>
            ))}
        </span>
    );
}
