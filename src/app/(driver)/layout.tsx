import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { driverNav } from "@/components/layout/navigation";
import { mockSession } from "@/lib/mock/session";

export default function DriverLayout({ children }: { children: ReactNode }) {
  const roleLabel = mockSession.role === "DRIVER" ? "Driver" : "Cashier";

  return (
    <AppShell
      nav={driverNav}
      businessName={mockSession.businessName}
      userLine={`${roleLabel} · ${mockSession.userName}`}
    >
      {children}
    </AppShell>
  );
}
