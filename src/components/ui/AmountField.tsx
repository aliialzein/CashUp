import { formatAmountInput, sanitizeAmountInput } from "@/lib/format/amountInput";
import type { Currency } from "@/lib/format/money";

type AmountFieldProps = {
    currency: Currency;
    /** Decimal text such as "12.50". Kept as a string, never a number. */
    value: string;
    onChange: (value: string) => void;
    /** Name read by screen readers. Defaults to "Amount USD" or "Amount LBP". */
    label?: string;
};

export function AmountField({ currency, value, onChange, label }: AmountFieldProps) {
    return (
        <div className="relative">
            <input
                inputMode={currency === "USD" ? "decimal" : "numeric"}
                value={formatAmountInput(value)}
                placeholder={currency === "USD" ? "0.00" : "0"}
                onChange={(event) => onChange(sanitizeAmountInput(event.target.value, currency))}
                aria-label={label ?? `Amount ${currency}`}
                className="min-h-14 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 pt-4 text-right font-mono text-xl font-semibold text-ink tabular-nums placeholder:text-line-strong focus-visible:outline-2 focus-visible:outline-ink"
            />
            <span className="pointer-events-none absolute top-2 left-3.5 text-[11px] font-semibold text-muted">
                {currency}
            </span>
        </div>
    );
}
