"use client";

import { useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Wallet, Users, UserRound } from "lucide-react";
import { routes } from "@/lib/routes";

// "Account" comes back when an owner account page exists (today /owner/account would be a 404).
const navigation = [
  { label: "Home", href: routes.owner.home, icon: House },
  { label: "Cash-ups", href: routes.owner.cashUps, icon: Wallet },
  { label: "Team", href: routes.owner.team, icon: Users },
  { label: "Account", href: "/owner/account", icon: UserRound },
];

export default function OwnerDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-[#ffffff]">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              ☰
            </button>

            <Link href={routes.owner.home} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f172a] text-white">
                C
              </div>

              <span className="text-lg font-bold tracking-tight text-[#0f172a]">
                CashUp
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-[#475569] sm:block">
              Owner Workspace
            </span>

            {/* <div className="hidden sm:block">
              <LogoutButton />
            </div> */}
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative flex h-full w-70 max-w-[85vw] flex-col bg-[#ffffff] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[#e2e8f0] px-5">
              <span className="font-bold text-[#0f172a]">Navigation</span>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg px-3 py-2 text-lg text-[#475569] hover:bg-[#f1f5f9]"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Workspace
              </p>

              {navigation.map((item) => {
                const isActive =
                  item.href === routes.owner.home
                    ? pathname === routes.owner.home
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#f1f5f9] text-[#0f172a]"
                        : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                    }`}
                  >
                    <item.icon
                      size={20}
                      strokeWidth={1.8}
                      className={isActive ? "text-[#0f172a]" : "text-[#475569]"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center justify-between border-t border-[#e2e8f0] p-4">
              <p className="text-xs text-[#475569]">CashUp · Owner Dashboard</p>
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
