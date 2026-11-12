import type { IconName } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";

export type NavItem = {
	label: string;
	href: string;
	icon: IconName;
	/** Paths that keep this link highlighted. The sales pages belong to "Today", for example. */
	activePaths: string[];
};

export const driverNav: NavItem[] = [
	{
		label: "Today",
		href: routes.driver.today,
		icon: "sheet",
		activePaths: [routes.driver.today, routes.driver.sales, routes.driver.cashOuts, routes.driver.countCash],
	},
	{ label: "History", href: routes.driver.history, icon: "clock", activePaths: [routes.driver.history] },
	{ label: "Account", href: routes.driver.account, icon: "user", activePaths: [routes.driver.account] },
];

/** True when `pathname` is one of the item's pages, or inside one. `null` (address not known yet) is never active. */
export function isNavActive(pathname: string | null, item: NavItem): boolean {
	if (pathname === null) return false;
	return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export type PhoneChrome = {
	/** The top bar with the business name. */
	businessBar: boolean;
	/** The bottom tabs. */
	tabs: boolean;
};

const TAB_ROOTS: string[] = driverNav.map((item) => item.href);

/**
 * Which bars the phone shows on a page. It reads the address, never the page content,
 * because Next.js keeps pages you left alive and hidden, and their content would still count.
 * Every other page shows neither bar: its own title bar takes the place.
 */
export function phoneChrome(pathname: string | null): PhoneChrome {
	if (pathname === null) return { businessBar: true, tabs: true };

	const isTabRoot = TAB_ROOTS.includes(pathname);
	const isHistoryDetail = pathname.startsWith(`${routes.driver.history}/`);
	return { businessBar: isTabRoot, tabs: isTabRoot || isHistoryDetail };
}
