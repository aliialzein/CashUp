import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/driver/cash-out/reasons";

type ReasonPickerProps = {
    value: CashOutReason;
    onChange: (reason: CashOutReason) => void;
};

/** One reason must be selected. Pills wrap onto a new line when there is no room. Larger on the phone, for thumbs. */
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
                        className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium md:min-h-9 md:px-3.5 md:text-[13px] ${active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                            }`}
                    >
                        {reason}
                    </button>
                );
            })}
        </div>
    );
}
