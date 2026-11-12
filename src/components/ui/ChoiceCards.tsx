type ChoiceOption<T extends string> = { value: T; title: string; subtitle: string };

type ChoiceCardsProps<T extends string> = {
    /** Describes the group for screen readers. */
    label: string;
    options: ChoiceOption<T>[];
    value: T;
    onChange: (value: T) => void;
};

/**
 * A vertical list of cards where exactly one is selected, with a radio dot on the right.
 * Each card is white. The selected one has a dark border. Inside a white desktop card it is also tinted.
 */
export function ChoiceCards<T extends string>({ label, options, value, onChange }: ChoiceCardsProps<T>) {
    return (
        <div role="radiogroup" aria-label={label} className="space-y-2">
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(option.value)}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-xl border bg-surface px-4 py-3.5 text-left ${active ? "border-ink md:bg-canvas" : "border-line hover:bg-canvas"
                            }`}
                    >
                        <span className="flex-1">
                            <span className="block font-heading font-semibold">{option.title}</span>
                            <span className="block text-[13px] text-muted">{option.subtitle}</span>
                        </span>
                        <span
                            className={`flex size-5 items-center justify-center rounded-full border-2 ${active ? "border-ink" : "border-line-strong"
                                }`}
                        >
                            {active && <span className="size-2.5 rounded-full bg-ink" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
