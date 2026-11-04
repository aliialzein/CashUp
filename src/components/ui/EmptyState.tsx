import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";

type IconName = ComponentProps<typeof Icon>["name"];

type EmptyStateProps = {
    icon: IconName;
    title: string;
    text: string;
    /** An optional action, like a button. */
    children?: ReactNode;
    /** No border or background, for use inside a card that already has them. */
    bare?: boolean;
    /** Less vertical space, for a small card. */
    compact?: boolean;
    className?: string;
};

/** What a page shows when it has nothing to list yet: icon, title, a line of help and maybe a button. */
export function EmptyState({ icon, title, text, children, bare = false, compact = false, className = "" }: EmptyStateProps) {
    const frame = bare ? "" : "rounded-xl border border-dashed border-line-strong bg-surface";
    return (
        <section
            className={`flex flex-col items-center gap-3 px-6 text-center ${compact ? "py-10" : "py-16"} ${frame} ${className}`}
        >
            <span className="flex size-12 items-center justify-center rounded-full bg-subtle text-muted">
                <Icon name={icon} size={22} />
            </span>
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
            <p className="max-w-95 text-sm leading-relaxed text-muted">{text}</p>
            {children && <div className="mt-2">{children}</div>}
        </section>
    );
}
