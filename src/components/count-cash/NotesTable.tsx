import { Card } from "@/components/ui/Card";
import { totalOfNotes } from "@/lib/count-cash/calculations";
import { DENOMINATIONS, formatDenomination, type NoteCounts } from "@/lib/count-cash/denominations";
import { formatNumber, type Currency } from "@/lib/format/money";
import { NoteStepper } from "./NoteStepper";

const ROW = "grid grid-cols-[1fr_150px_130px] items-center gap-3 px-5";

type NotesTableProps = {
    currency: Currency;
    counts: NoteCounts;
    onChange: (counts: NoteCounts) => void;
    /** Sets every count of this currency back to 0. */
    onReset: () => void;
};

/** One row per note kind: how many the driver has, and what they add up to. */
export function NotesTable({ currency, counts, onChange, onReset }: NotesTableProps) {
    const isEmpty = Object.values(counts).every((count) => count === 0);

    return (
        <Card as="section" aria-label={`${currency} notes`} className="overflow-hidden">
            <div className={`${ROW} h-10 border-b border-line bg-canvas text-xs font-medium tracking-wider text-muted uppercase`}>
                <span className="flex items-center gap-2">
                    {currency} notes
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={isEmpty}
                        aria-label={`Reset ${currency} count`}
                        className="rounded px-1.5 py-0.5 text-xs font-medium tracking-normal normal-case text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-40 disabled:hover:text-muted disabled:hover:no-underline"
                    >
                        Reset
                    </button>
                </span>
                <span className="text-center">Count</span>
                <span className="text-right">Total</span>
            </div>

            {DENOMINATIONS[currency].map((denomination) => {
                const count = counts[denomination] ?? 0;
                const name = formatDenomination(denomination);
                return (
                    <div key={denomination} className={`${ROW} h-13 border-b border-subtle last:border-b-0`}>
                        <span className="font-mono font-semibold">{name}</span>
                        <NoteStepper
                            label={`${name} ${currency}`}
                            count={count}
                            onChange={(next) => onChange({ ...counts, [denomination]: next })}
                        />
                        <span className="text-right font-mono text-sm text-muted">
                            {formatNumber(totalOfNotes({ [denomination]: count }), currency)}
                        </span>
                    </div>
                );
            })}
        </Card>
    );
}
