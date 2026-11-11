import { GapCell } from "@/components/driver/cash-up/CountResult";
import { formatNumber, type Amounts } from "@/lib/format/money";

/** Every row shares these columns, so the numbers line up. */
const ROW = "grid grid-cols-[0.9fr_1fr_1.2fr] items-center text-sm";
const NUM = "text-right font-mono text-[13px]";
const COLUMN_TITLE = "text-right text-xs font-medium tracking-wider text-muted uppercase";

type CountTotalsProps = {
    counted: Amounts;
    /** What the drawer should hold, calculated by the server. */
    expected: Amounts;
    /** Counted minus expected, for the screen only: the backend freezes the real gap at submit. */
    gap: Amounts;
};

/** Counted, Expected and Gap for USD and LBP. Used by the phone bar and the desktop footer card. */
export function CountTotals({ counted, expected, gap }: CountTotalsProps) {
    return (
        <div role="group" aria-label="Counted against expected" className="flex flex-col gap-1.5">
            <div className={ROW}>
                <span />
                <span className={COLUMN_TITLE}>USD</span>
                <span className={COLUMN_TITLE}>LBP</span>
            </div>
            <div className={ROW}>
                <span className="text-muted">Counted</span>
                <span className={NUM}>{formatNumber(counted.usd, "USD")}</span>
                <span className={NUM}>{formatNumber(counted.lbp, "LBP")}</span>
            </div>
            <div className={ROW}>
                <span className="text-muted">Expected</span>
                <span className={NUM}>{formatNumber(expected.usd, "USD")}</span>
                <span className={NUM}>{formatNumber(expected.lbp, "LBP")}</span>
            </div>
            <div className={ROW}>
                <span className="font-semibold">Gap</span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="USD" value={gap.usd} />
                </span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="LBP" value={gap.lbp} />
                </span>
            </div>
        </div>
    );
}
