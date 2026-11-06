"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { originFromPath, withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

type BusinessSwitcherProps = {
    businessName: string;
    /** Second line under the business name, e.g. "Driver · Mohamad". */
    userLine: string;
};

function SwitcherLink({ href, businessName, userLine }: BusinessSwitcherProps & { href: string }) {
    return (
        <Link
            href={href}
            aria-label={`Switch business, current: ${businessName}`}
            className="flex min-h-11 flex-col items-start justify-center md:items-end"
        >
            <span className="flex items-center gap-1 font-heading text-[15px] font-semibold">
                {businessName}
                <Icon name="chevronDown" size={16} className="text-muted" />
            </span>
            <span className="text-xs text-muted">{userLine}</span>
        </Link>
    );
}

/** Opens Switch business and remembers the page the driver is on, so Cancel can return to it. */
export function BusinessSwitcher(props: BusinessSwitcherProps) {
    const origin = originFromPath(usePathname());
    const href = origin ? withOrigin(routes.driver.switchBusiness, origin) : routes.driver.switchBusiness;
    return <SwitcherLink href={href} {...props} />;
}

/** Shown while the current path is not known yet. */
export function BusinessSwitcherFallback(props: BusinessSwitcherProps) {
    return <SwitcherLink href={routes.driver.switchBusiness} {...props} />;
}
