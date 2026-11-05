import { MAX_NOTE_COUNT } from "@/lib/count-cash/denominations";
import { parseCount } from "@/lib/count-cash/calculations";

/** − , the number and + sit in one compact pill, so the row reads as a single control. */
const PILL = "inline-flex items-stretch overflow-hidden rounded-xl border border-line-strong bg-surface";

const STEP_BUTTON =
    "inline-flex w-9 items-center justify-center text-lg text-ink disabled:opacity-40 md:hover:bg-subtle md:disabled:hover:bg-surface";


/** The middle cell looks like a field, so the driver knows it can be typed. Grey at 0. */
const COUNT_FIELD =
    "h-9 w-14 border-x border-line-strong bg-subtle text-center font-mono text-lg font-semibold focus:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink md:w-12 md:text-base";

type NoteStepperProps = {
    /** Names the note for screen readers, e.g. "20 USD". */
    label: string;
    count: number;
    onChange: (count: number) => void;
    /** Lets a label elsewhere in the card open the keypad for this field. */
    inputId?: string;
};

/** − and + buttons around a count the driver can also type. */
export function NoteStepper({ label, count, onChange, inputId }: NoteStepperProps) {
    return (
        <div className="flex justify-center">
            <div className={PILL}>
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
                    id={inputId}
                    inputMode="numeric"
                    enterKeyHint="done"
                    autoComplete="off"
                    aria-label={`${label} notes`}
                    value={count}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => onChange(parseCount(event.target.value))}
                    className={`${COUNT_FIELD} ${count === 0 ? "text-muted" : "text-ink"}`}
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
        </div>
    );
}
