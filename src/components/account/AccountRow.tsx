import Link from "next/link";
import type { ComponentProps } from "react";
import { Icon } from "@/components/ui/Icon";

type IconName = ComponentProps<typeof Icon>["name"];

type AccountRowProps = {
    icon: IconName;
    title: string;
    description: string;
    /** Shown at the right, e.g. the current language. */
    value?: string;
    /** Without a destination the row is plain information and has no chevron. */
    href?: string;
};

const ROW = "flex items-center gap-3.5 px-5 py-3.5";

export function AccountRow({ icon, title, description, value, href }: AccountRowProps) {
    const content = (
        <>
            <span className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-subtle text-muted">
                <Icon name={icon} size={20} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-heading text-[15px] font-semibold">{title}</span>
                <span className="text-[13px] text-muted">{description}</span>
            </span>
            {value && <span className="text-sm text-muted">{value}</span>}
            {href && (
                <span className="text-muted">
                    <Icon name="chevronRight" size={18} />
                </span>
            )}
        </>
    );

    if (!href) return <div className={ROW}>{content}</div>;

    return (
        <Link href={href} className={`${ROW} hover:bg-canvas`}>
            {content}
        </Link>
    );
}
