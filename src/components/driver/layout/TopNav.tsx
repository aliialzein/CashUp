"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, type NavItem } from "./navigation";

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
    return (
        <nav aria-label="Main" className="flex">
            {items.map((item) => {
                const active = isNavActive(pathname, item);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-16 items-center border-b-2 px-4 text-sm ${
                            active
                                ? "border-ink font-semibold text-ink"
                                : "border-transparent font-medium text-muted hover:text-ink"
                        }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

/** The links with the current page highlighted. It needs the browser address, so it sits inside Suspense. */
export function TopNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    return <NavLinks items={items} pathname={pathname} />;
}

/** The same links with no highlight, shown until the address is known. */
export function TopNavFallback({ items }: { items: NavItem[] }) {
    return <NavLinks items={items} pathname={null} />;
}
