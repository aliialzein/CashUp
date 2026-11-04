import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";

type PageHeaderProps = {
    title: string;
    subtitle?: string;
    back?: { href: string; label: string };
    /** A small status next to the title, like a Badge. */
    badge?: ReactNode;
    /** Something at the right, like a button. */
    action?: ReactNode;
};

/** Optional back link, then the page title with an optional badge, subtitle and action. */
export function PageHeader({ title, subtitle, back, badge, action }: PageHeaderProps) {
    return (
        <>
            {back && <BackLink href={back.href}>{back.label}</BackLink>}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
                        {badge}
                    </div>
                    {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
                </div>
                {action}
            </div>
        </>
    );
}
