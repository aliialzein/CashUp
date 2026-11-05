import { totalOfNotes } from "@/lib/count-cash/calculations";
import { DENOMINATIONS, formatDenomination, type NoteCounts } from "@/lib/count-cash/denominations";
import { formatNumber, type Currency } from "@/lib/format/money";
import { NoteStepper } from "./NoteStepper";

type NoteCardsProps = {
    currency: Currency;
    counts: NoteCounts;
    onChange: (counts: NoteCounts) => void;
};

/** Phone only: one card per note kind. Tapping the name opens the keypad for its count. */
export function NoteCards({ currency, counts, onChange }: NoteCardsProps) {
    return (
        <ul aria-label={`${currency} notes`} className="flex flex-col gap-2">
            {DENOMINATIONS[currency].map((denomination) => {
                const count = counts[denomination] ?? 0;
                const name = formatDenomination(denomination);
                const inputId = `note-${currency}-${denomination}`;
                return (
                    <li
                        key={denomination}
                        className="flex min-h-15 items-center justify-between gap-2 rounded-xl border border-line bg-surface py-2 pr-2 pl-4"
                    >
                        <label htmlFor={inputId} className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <span className="font-mono text-base font-semibold">{currency === "USD" ? `$${name}` : name}</span>
                            <span className="font-mono text-xs text-muted">
                                = {formatNumber(totalOfNotes({ [denomination]: count }), currency)}
                            </span>
                        </label>
                        <NoteStepper
                            inputId={inputId}
                            label={`${name} ${currency}`}
                            count={count}
                            onChange={(next) => onChange({ ...counts, [denomination]: next })}
                        />
                    </li>
                );
            })}
        </ul>
    );
}
