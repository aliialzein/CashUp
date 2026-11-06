import type { Currency } from "@/lib/format/money";

type CountFlowActionsProps = {
    /** The currency on screen. */
    currency: Currency;
    /** True when every note of this currency is 0, so there is nothing to reset. */
    isEmpty: boolean;
    onReset: () => void;
    /** Goes to the other currency. */
    onSwitch: () => void;
};

/**
 * Phone only: the end of a currency's list. Reset starts this currency over, and the other button
 * leads the driver to the next step, so nobody has to discover that the tabs on top can be tapped.
 */
export function CountFlowActions({ currency, isEmpty, onReset, onSwitch }: CountFlowActionsProps) {
    const other: Currency = currency === "USD" ? "LBP" : "USD";
    // USD is counted first, so from USD the way on is forward, and from LBP it is back.
    const label = currency === "USD" ? `Now count ${other} →` : `← Back to ${other}`;

    return (
        <div className="flex items-center justify-between gap-3 pt-1">
            <button
                type="button"
                onClick={onReset}
                disabled={isEmpty}
                className="min-h-11 rounded-lg px-1 text-sm font-semibold text-muted underline-offset-2 disabled:opacity-40"
            >
                Reset {currency}
            </button>
            <button
                type="button"
                onClick={onSwitch}
                className="min-h-11 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink"
            >
                {label}
            </button>
        </div>
    );
}
