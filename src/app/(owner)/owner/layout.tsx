import { Suspense } from "react";
import OwnerDashboardShell from "@/components/owner/OwnerDashboardShell";

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7FAF8]" />}>
      <OwnerDashboardShell>{children}</OwnerDashboardShell>
    </Suspense>
  );
}
