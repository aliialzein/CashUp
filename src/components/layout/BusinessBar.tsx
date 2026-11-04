"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { phoneChrome } from "./navigation";

const BAR = "sticky top-0 z-20 border-b border-line bg-surface";

function Frame({ visibleOnPhone, children }: { visibleOnPhone: boolean; children: ReactNode }) {
    return <header className={visibleOnPhone ? BAR : `${BAR} hidden md:block`}>{children}</header>;
}

/** The top bar. On phone it only shows on pages that start a section (see phoneChrome). Desktop always shows it. */
export function BusinessBar({ children }: { children: ReactNode }) {
    const { businessBar } = phoneChrome(usePathname());
    return <Frame visibleOnPhone={businessBar}>{children}</Frame>;
}

/** Shown until the address is known. */
export function BusinessBarFallback({ children }: { children: ReactNode }) {
    return <Frame visibleOnPhone>{children}</Frame>;
}
