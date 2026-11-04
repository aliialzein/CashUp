import { routes } from "@/lib/routes";

export type NavItem = {
	label: string;
	href: string;
	/** Paths that keep this link highlighted. The sales pages belong to "Today", for example. */
	activePaths: string[];
};

export const driverNav: NavItem[] = [
	{
		label: "Today",
		href: routes.driver.today,
		activePaths: [
			routes.driver.today,
			routes.driver.sales,
			routes.driver.cashOuts,
			routes.driver.countCash,
		],
	},
	{ label: "History", href: routes.driver.history, activePaths: [routes.driver.history] },
	{ label: "Account", href: routes.driver.account, activePaths: [routes.driver.account] },
];
