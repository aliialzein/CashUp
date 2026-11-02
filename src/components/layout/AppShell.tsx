import { Suspense, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { TopNav, TopNavFallback } from "./TopNav";
import type { NavItem } from "./navigation";

type AppShellProps = {
  nav: NavItem[];
  businessName: string;
  /** Second line under the business name, e.g. "Driver · Mohamad". */
  userLine: string;
  children: ReactNode;
};

/** Frame shared by every signed-in page: a top bar, then a centred content area. */
export function AppShell({ nav, businessName, userLine, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-8">
          <div className="flex items-center">
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

          {/* Business switcher. It will open the "Switch business" page later. */}
          <button
            type="button"
            aria-label={`Switch business, current: ${businessName}`}
            className="flex min-h-11 flex-col items-end justify-center"
          >
            <span className="flex items-center gap-1 font-heading text-[15px] font-semibold">
              {businessName}
              <Icon name="chevronDown" size={16} className="text-muted" />
            </span>
            <span className="text-xs text-muted">{userLine}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 pt-7 pb-12">{children}</main>
    </div>
  );
}
