type ChipOption<T extends string> = {
    value: T;
    label: string;
    count?: number;
    /** Phone only: a small dot before the label. A Tailwind background class, e.g. "bg-amber-600". */
    dot?: string;
};

type FilterChipsProps<T extends string> = {
    /** Describes the group for screen readers, e.g. "Filter sales". */
    label: string;
    options: ChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Greys the chips out on desktop, for a list that has nothing to filter yet. */
    disabled?: boolean;
};

/**
 * A row of pill buttons where exactly one is selected. A chip shows its count when it has one.
 * On phone the row scrolls sideways instead of wrapping, and the chips are taller.
 */
export function FilterChips<T extends string>({ label, options, value, onChange, disabled = false }: FilterChipsProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap md:min-h-9 md:gap-0 md:disabled:opacity-55 ${active
                                ? "border-ink bg-ink font-semibold text-white md:font-medium"
                                : "border-line-strong bg-surface font-medium text-ink hover:bg-subtle disabled:hover:bg-surface"
                            }`}
                    >
                        {option.dot && <span aria-hidden className={`size-2 rounded-full ${option.dot} md:hidden`} />}
                        {option.label}
                        {option.count !== undefined && (
                            <span
                                className={`font-mono text-xs md:ml-1 md:font-sans md:text-[13px] ${active ? "" : "text-muted md:text-inherit"}`}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
