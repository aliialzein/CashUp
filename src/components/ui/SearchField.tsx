type SearchFieldProps = {
    value: string;
    onChange: (value: string) => void;
    /** Read by screen readers. */
    label: string;
    placeholder: string;
    className?: string;
};

/** A search box. On phone it is full width with a magnifier. On desktop it is a fixed width with no icon. */
export function SearchField({ value, onChange, label, placeholder, className = "" }: SearchFieldProps) {
    return (
        <div className={`relative md:w-80 ${className}`}>
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted md:hidden"
            >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-label={label}
                placeholder={placeholder}
                className="min-h-11 w-full rounded-[10px] border border-line-strong bg-surface pr-3 pl-9.5 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink md:pl-3.5 md:text-[15px]"
            />
        </div>
    );
}
