import { formatNumber, type Amounts, type Currency } from "@/lib/format/money";

const CURRENCIES: Currency[] = ["USD", "LBP"];

type CurrencyTabsProps = {
    value: Currency;
    onChange: (currency: Currency) => void;
    /** What has been counted so far, shown live on each tab. */
    counted: Amounts;
};

/** Phone only: pick which currency's notes to count. Each tab shows its running total. */
export function CurrencyTabs({ value, onChange, counted }: CurrencyTabsProps) {
    return (
        <div className="flex flex-col gap-2">
            <div role="group" aria-label="Currency" className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((currency) => {
                    const active = currency === value;
                    return (
                        <button
                            key={currency}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(currency)}
                            className={`flex min-h-15 flex-col items-start justify-center gap-0.5 rounded-xl border px-4 transition-colors duration-500 ease-in-out motion-reduce:transition-none ${
                                active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink"
                            }`}
                        >
                            <span className="text-xs font-semibold tracking-wider">{currency}</span>
                            <span className="font-mono text-base font-semibold">
                                {formatNumber(counted[currency === "USD" ? "usd" : "lbp"], currency)}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-[13px] text-muted">Count each currency, then save.</p>
        </div>
    );
}
