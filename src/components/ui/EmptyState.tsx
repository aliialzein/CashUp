import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";

type IconName = ComponentProps<typeof Icon>["name"];

type EmptyStateProps = {
    icon: IconName;
    title: string;
    text: ReactNode;
    /** An optional action, like a button. */
    children?: ReactNode;
    /** No border or background, for use inside a card that already has them. */
    bare?: boolean;
    /** Less vertical space, for a small card. On phone it is smaller still. */
    compact?: boolean;
    className?: string;
};

/** What a page shows when it has nothing to list yet: icon, title, a line of help and maybe a button. */
export function EmptyState({ icon, title, text, children, bare = false, compact = false, className = "" }: EmptyStateProps) {
    const frame = bare ? "" : "rounded-xl border border-dashed border-line-strong bg-surface";
    const spacing = compact ? "gap-2 py-4 md:gap-3 md:py-10" : "gap-2.5 py-7 md:gap-3 md:py-16";
    const iconSize = compact ? "size-10 md:size-12" : "size-12";
    return (
        <section className={`flex flex-col items-center px-6 text-center ${spacing} ${frame} ${className}`}>
            <span className={`flex items-center justify-center rounded-full bg-subtle text-muted ${iconSize}`}>
                <Icon name={icon} size={22} />
            </span>
            <h2 className="font-heading text-base font-semibold md:text-lg">{title}</h2>
            <p className="max-w-95 text-sm leading-relaxed text-muted">{text}</p>
            {children && <div className="mt-2 flex w-full justify-center">{children}</div>}
        </section>
    );
}
