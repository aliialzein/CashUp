import type { ReactNode } from "react";

type UseChipProps = {
    onClick: () => void;
    children: ReactNode;
};

/** A small pill button next to a field title that fills the field with a suggested amount. */
export function UseChip({ onClick, children }: UseChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="min-h-8 rounded-full border border-line-strong bg-surface px-3 text-xs font-semibold text-ink hover:bg-subtle"
        >
            {children}
        </button>
    );
}
