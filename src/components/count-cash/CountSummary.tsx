import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { GapText } from "./GapText";

type CountSummaryProps = {
    counted: Amounts;
    expected: Amounts;
    /** Counted minus expected, per currency. */
    gap: Amounts;
};

const CELL = "flex flex-col gap-1 px-5 py-4";
const LABEL = "text-xs font-medium tracking-wider text-muted uppercase";

/** Three separate cards with a 10px gap between them. */
export function CountSummary({ counted, expected, gap }: CountSummaryProps) {
    return (
        <section aria-label="Count summary" className="grid grid-cols-3 gap-2.5">
            <Card className={CELL}>
                <span className={LABEL}>Counted</span>
                <span className="font-mono font-semibold">{formatAmounts(counted)}</span>
            </Card>
            <Card className={CELL}>
                <span className={LABEL}>Expected</span>
                <span className="font-mono font-semibold">{formatAmounts(expected)}</span>
            </Card>
            <Card className={CELL}>
                <span className={LABEL}>Gap</span>
                <span className="font-mono font-semibold">
                    <GapText gap={gap} />
                </span>
            </Card>
        </section>
    );
}
