"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { isNavActive, phoneChrome, type NavItem } from "./navigation";

function TabLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-30 flex h-18 justify-around border-t border-line bg-surface px-2 py-2 md:hidden"
        >
            {items.map((item) => {
                const active = isNavActive(pathname, item);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-12 min-w-18 flex-col items-center justify-center gap-0.5 text-xs ${active ? "font-semibold text-ink" : "font-medium text-muted"
                            }`}
                    >
                        <Icon name={item.icon} size={22} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

/** The phone's bottom tabs. They only show on pages that belong to a tab (see phoneChrome). */
export function PhoneTabBar({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    if (!phoneChrome(pathname).tabs) return null;
    return <TabLinks items={items} pathname={pathname} />;
}

/** The same tabs with no highlight, shown until the address is known. */
export function PhoneTabBarFallback({ items }: { items: NavItem[] }) {
    return <TabLinks items={items} pathname={null} />;
}
