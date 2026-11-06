import type { ReactNode } from "react";
import { AppShell } from "@/components/driver/layout/AppShell";
import { driverNav } from "@/components/driver/layout/navigation";
import { mockSession } from "@/lib/driver/mock/session";

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
