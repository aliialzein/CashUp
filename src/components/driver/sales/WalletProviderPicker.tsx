export type WalletProvider = "WHISH" | "OMT";

export const WALLET_LABELS: Record<WalletProvider, string> = {
    WHISH: "Whish",
    OMT: "OMT",
};

type WalletProviderPickerProps = {
    value: WalletProvider;
    onChange: (value: WalletProvider) => void;
};

/** Pick which wallet the client paid with. Exactly one is always selected. */
export function WalletProviderPicker({ value, onChange }: WalletProviderPickerProps) {
    return (
        <div role="radiogroup" aria-label="Wallet" className="grid grid-cols-2 gap-2">
            {(Object.keys(WALLET_LABELS) as WalletProvider[]).map((provider) => {
                const active = provider === value;
                return (
                    <button
                        key={provider}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(provider)}
                        className={`min-h-14 rounded-xl border text-sm font-semibold ${active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                            }`}
                    >
                        {WALLET_LABELS[provider]}
                    </button>
                );
            })}
        </div>
    );
}
