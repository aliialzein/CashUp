import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Icon } from "@/components/ui/Icon";

type PageHeaderProps = {
    title: string;
    subtitle?: string;
    /** The parent page. Desktop shows a "‹ Page" link, and the phone bar shows a ← arrow. */
    back?: { href: string; label: string };
    /** Phone only: a ← in the bar that replaces the Cancel button of a form. Desktop shows nothing extra. */
    phoneBack?: { href: string; label: string };
    /** Phone only: a ✕ in the bar that replaces the Cancel button of a form. */
    close?: { href: string };
    /** A small status next to the title, like a Badge. On phone it sits at the right of the bar. */
    badge?: ReactNode;
    /** Something at the right, like a button. */
    action?: ReactNode;
};

type PhoneBarProps = Pick<PageHeaderProps, "title" | "subtitle" | "badge" | "action"> & {
    leading: { href: string; label: string; icon: "chevronLeft" | "close" };
};

/** The phone's top bar for pages inside a flow. It takes the place of the business bar. */
function PhoneBar({ leading, title, subtitle, badge, action }: PhoneBarProps) {
    return (
        <div
            data-page-bar
            className="sticky top-0 z-20 -mx-4 -mt-4 flex h-14 items-center gap-0.5 border-b border-line bg-surface pr-3 pl-1 md:hidden"
        >
            <Link
                href={leading.href}
                aria-label={leading.label}
                className="flex size-11 shrink-0 items-center justify-center text-ink"
            >
                <Icon name={leading.icon} size={22} />
            </Link>
            <div className="min-w-0">
                <h1 className="truncate font-heading text-base leading-tight font-semibold">{title}</h1>
                {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
                {badge}
                {action}
            </div>
        </div>
    );
}

/** Page title with an optional back link, badge, subtitle and action. With `back`, `phoneBack` or `close`, the phone gets a top bar instead. */
export function PageHeader({ title, subtitle, back, phoneBack, close, badge, action }: PageHeaderProps) {
    const leading = back
        ? { href: back.href, label: `Back to ${back.label}`, icon: "chevronLeft" as const }
        : phoneBack
            ? { href: phoneBack.href, label: `Back to ${phoneBack.label}`, icon: "chevronLeft" as const }
            : close
                ? { href: close.href, label: "Close", icon: "close" as const }
                : null;

    return (
        <>
            {leading && <PhoneBar leading={leading} title={title} subtitle={subtitle} badge={badge} action={action} />}
            <div className={leading ? "hidden space-y-5 md:block" : "space-y-5"}>
                {back && <BackLink href={back.href}>{back.label}</BackLink>}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
                            {badge}
                        </div>
                        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            </div>
        </>
    );
}
