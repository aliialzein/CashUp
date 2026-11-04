import type { ReactNode } from "react";

type BottomBarProps = {
    children: ReactNode;
    /** True for a bar that sits above the tab bar (Today's Submit). Otherwise it sits at the very bottom. */
    aboveTabs?: boolean;
};

const BASE = "fixed inset-x-0 z-20 border-t border-line bg-surface px-4 md:static md:z-auto md:border-0 md:bg-transparent md:p-0";

/** Buttons stuck to the bottom of the phone screen. On desktop it is just a normal block. */
export function BottomBar({ children, aboveTabs = false }: BottomBarProps) {
    return <div className={`${BASE} ${aboveTabs ? "bottom-18 py-2.5" : "bottom-0 pt-3 pb-5"}`}>{children}</div>;
}
