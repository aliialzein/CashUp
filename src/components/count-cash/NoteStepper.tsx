import { MAX_NOTE_COUNT } from "@/lib/count-cash/denominations";
import { parseCount } from "@/lib/count-cash/calculations";

const STEP_BUTTON =
    "inline-flex size-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-lg text-ink hover:bg-subtle disabled:opacity-40 disabled:hover:bg-surface";

type NoteStepperProps = {
    /** Names the note for screen readers, e.g. "20 USD". */
    label: string;
    count: number;
    onChange: (count: number) => void;
};

/** − and + buttons around a count the driver can also type. */
export function NoteStepper({ label, count, onChange }: NoteStepperProps) {
    return (
        <div className="flex items-center justify-center gap-2.5">
            <button
                type="button"
                aria-label={`Remove one ${label} note`}
                disabled={count <= 0}
                onClick={() => onChange(count - 1)}
                className={STEP_BUTTON}
            >
                −
            </button>
            <input
                inputMode="numeric"
                aria-label={`${label} notes`}
                value={count}
                onFocus={(event) => event.target.select()}
                onChange={(event) => onChange(parseCount(event.target.value))}
                className="w-12 rounded-md bg-transparent text-center font-mono font-semibold text-ink focus-visible:outline-2 focus-visible:outline-ink"
            />
            <button
                type="button"
                aria-label={`Add one ${label} note`}
                disabled={count >= MAX_NOTE_COUNT}
                onClick={() => onChange(count + 1)}
                className={STEP_BUTTON}
            >
                +
            </button>
        </div>
    );
}
