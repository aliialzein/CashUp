import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/cash-out/reasons";

type ReasonPickerProps = {
    value: CashOutReason;
    onChange: (reason: CashOutReason) => void;
};

/** One reason must be selected. Pills wrap onto a new line when there is no room. */
export function ReasonPicker({ value, onChange }: ReasonPickerProps) {
    return (
        <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
            {CASH_OUT_REASONS.map((reason) => {
                const active = reason === value;
                return (
                    <button
                        key={reason}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(reason)}
                        className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-medium ${active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                            }`}
                    >
                        {reason}
                    </button>
                );
            })}
        </div>
    );
}
