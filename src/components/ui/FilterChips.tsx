type ChipOption<T extends string> = { value: T; label: string; count?: number };

type FilterChipsProps<T extends string> = {
    /** Describes the group for screen readers, e.g. "Filter sales". */
    label: string;
    options: ChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Greys the chips out, for a list that has nothing to filter yet. */
    disabled?: boolean;
};

/** A row of pill buttons where exactly one is selected. A chip shows its count when it has one. */
export function FilterChips<T extends string>({ label, options, value, onChange, disabled = false }: FilterChipsProps<T>) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-medium disabled:opacity-55 ${active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:bg-subtle disabled:hover:bg-surface"
                            }`}
                    >
                        {option.label}
                        {option.count !== undefined && <span className="ml-1">{option.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}
