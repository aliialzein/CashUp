"use client";

import { useState } from "react";
import { cleanAmountInput, formatAmountInput } from "@/lib/format/amountInput";
import { capAmountInput } from "@/lib/money/amountLimits";
import type { Currency } from "@/lib/format/money";

type AmountFieldProps = {
    currency: Currency;
    /** Decimal text such as "12.50". Kept as a string, never a number. */
    value: string;
    onChange: (value: string) => void;
    /** Name read by screen readers. Defaults to "Amount USD" or "Amount LBP". */
    label?: string;
    /** The small tag in the corner. Defaults to the currency; e.g. "LBP per 1 USD" for a rate. */
    unit?: string;
};

export function AmountField({ currency, value, onChange, label, unit = currency }: AmountFieldProps) {
    // While typing the field shows plain digits, so a display comma never gets in the way of typing or backspace.
    // When the driver leaves the field, thousands commas come back for reading ("10005" -> "10,005").
    const [isFocused, setIsFocused] = useState(false);

    function handleChange(raw: string) {
        const cleaned = cleanAmountInput(raw, currency);
        // Refused text (a wrong comma, a letter, a space...) keeps the previous value.
        if (cleaned === null) return;
        onChange(capAmountInput(cleaned, value, currency));
    }

    return (
        <div className="relative">
            <input
                inputMode={currency === "USD" ? "decimal" : "numeric"}
                value={isFocused ? value : formatAmountInput(value)}
                placeholder={currency === "USD" ? "0.00" : "0"}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(event) => handleChange(event.target.value)}
                aria-label={label ?? `Amount ${currency}`}
                className="min-h-16 w-full rounded-xl border border-line-strong bg-surface px-3.5 pt-4 text-right font-mono text-[22px] font-semibold text-ink tabular-nums placeholder:text-line-strong focus-visible:outline-2 focus-visible:outline-ink md:min-h-14 md:rounded-[10px] md:text-xl"
            />
            <span className="pointer-events-none absolute top-2 left-3.5 text-[11px] font-semibold text-muted">
                {unit}
            </span>
        </div>
    );
}
