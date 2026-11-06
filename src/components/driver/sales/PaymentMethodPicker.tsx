import type { ReactNode } from "react";
import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";

const SVG = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
} as const;

type Option = { value: PaymentMethod; label: string; icon: ReactNode };

const OPTIONS: Option[] = [
    {
        value: "CASH",
        label: "Cash",
        icon: (
            <svg {...SVG}>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
            </svg>
        ),
    },
    {
        value: "WHISH",
        label: "Whish",
        icon: (
            <svg {...SVG}>
                <rect x="3" y="6" width="18" height="14" rx="3" />
                <path d="M16 13h2M3 10h18" />
            </svg>
        ),
    },
    {
        value: "OMT",
        label: "OMT",
        icon: (
            <svg {...SVG}>
                <path d="M7 7h11l-3-3M17 17H6l3 3" />
            </svg>
        ),
    },
];

type PaymentMethodPickerProps = {
    value: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
};

/**
 * How the client paid. A slim segmented bar with one dark pill that glides to the chosen method.
 * Exactly one is always selected.
 */
export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
    const index = OPTIONS.findIndex((option) => option.value === value);

    return (
        <div role="radiogroup" aria-label="Payment method" className="relative grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
            {/* One segment is (width - padding - gaps) / 3 wide. It moves by one segment plus one gap per step. */}
            <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc((100%-1rem)/3)] rounded-lg bg-ink shadow-sm transition-transform duration-500 ease-in-out motion-reduce:transition-none"
                style={{ transform: `translateX(calc(${index} * (100% + 0.25rem)))` }}
            />
            {OPTIONS.map(({ value: method, label, icon }) => {
                const active = method === value;
                return (
                    <button
                        key={method}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(method)}
                        className={`relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors duration-500 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink motion-reduce:transition-none ${
                            active ? "text-white" : "text-muted hover:text-ink"
                        }`}
                    >
                        {icon}
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
