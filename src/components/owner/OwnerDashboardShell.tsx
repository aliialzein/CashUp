"use client";

import { useState } from "react";
import LogoutButton from '@/components/auth/LogoutButton';
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", href: "/owner", icon: "⌂" },
  { label: "Cash-ups", href: "/owner/cash-ups", icon: "▤" },
];

export default function OwnerDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F7FAF8]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E5EEE8] bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button // this button is not clickable on my phone screen
              onClick={() => setIsOpen(true)}
              aria-label="Open navigation"
              className="flex h-15 w-15 items-center justify-center rounded-xl text-xl text-[#145B37] transition hover:bg-[#EAF5ED]"
            >
              ☰
            </button>

            <Link href="/owner" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#167344] text-white">
                C
              </div>

              <span className="text-lg font-bold tracking-tight text-[#145B37]">
                CashUp
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LogoutButton />
            <span className="hidden text-sm font-medium text-[#64756A] sm:block">
              Owner Workspace
            </span>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF5ED] font-semibold text-[#167344]">
              O
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <button
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          {/* Drawer */}
          <aside className="relative flex h-full w-70 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[#E5EEE8] px-5">
              <span className="font-bold text-[#145B37]">Navigation</span>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg px-3 py-2 text-lg text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Workspace
              </p>

              {navigation.map((item) => {
                const isActive =
                  item.href === "/owner"
                    ? pathname === "/owner"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#EAF5ED] text-[#167344]"
                        : "text-[#64756A] hover:bg-gray-50 hover:text-[#145B37]"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#E5EEE8] p-4">
              <p className="text-xs text-gray-400">CashUp · Owner Dashboard</p>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
