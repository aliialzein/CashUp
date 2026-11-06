import { Suspense, type ReactNode } from "react";
import { BusinessBar, BusinessBarFallback } from "./BusinessBar";
import { BusinessSwitcher, BusinessSwitcherFallback } from "./BusinessSwitcher";
import type { NavItem } from "./navigation";
import { PhoneTabBar, PhoneTabBarFallback } from "./PhoneTabBar";
import { TopNav, TopNavFallback } from "./TopNav";

type AppShellProps = {
	nav: NavItem[];
	businessName: string;
	/** Second line under the business name, e.g. "Driver · Mohamad". */
	userLine: string;
	children: ReactNode;
};

/**
 * Frame shared by every signed-in page.
 * Desktop: a top bar with the logo, the menu and the business. Phone: the bars depend on the page (see phoneChrome).
 */
export function AppShell({ nav, businessName, userLine, children }: AppShellProps) {
	const barContent = (
		<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16 md:px-8">
			<div className="hidden items-center md:flex">
				<span className="mr-6 flex items-center gap-2.5">
					<span
						aria-hidden="true"
						className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink font-heading text-[15px] font-bold text-white"
					>
						C
					</span>
					<span className="font-heading text-lg font-bold tracking-tight">CashUp</span>
				</span>
				<Suspense fallback={<TopNavFallback items={nav} />}>
					<TopNav items={nav} />
				</Suspense>
			</div>
			<Suspense fallback={<BusinessSwitcherFallback businessName={businessName} userLine={userLine} />}>
				<BusinessSwitcher businessName={businessName} userLine={userLine} />
			</Suspense>
		</div>
	);

	return (
		<div className="flex min-h-screen flex-col">
			<Suspense fallback={<BusinessBarFallback>{barContent}</BusinessBarFallback>}>
				<BusinessBar>{barContent}</BusinessBar>
			</Suspense>

			{/* The extra bottom space on phone keeps the last field clear of the tab bar and the sticky buttons. */}
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-7 md:pb-12">{children}</main>

			<Suspense fallback={<PhoneTabBarFallback items={nav} />}>
				<PhoneTabBar items={nav} />
			</Suspense>
		</div>
	);
}
