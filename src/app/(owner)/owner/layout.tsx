import { Suspense } from "react";
import { redirect } from 'next/navigation';
import { getCurrentUser, authDestination } from '@/modules/auth/auth.service';
import OwnerDashboardShell from "@/components/owner/OwnerDashboardShell";

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7FAF8]" />}>
      <AuthenticatedOwner>{children}</AuthenticatedOwner>
    </Suspense>
  );
}

async function AuthenticatedOwner({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (authDestination(user) !== '/owner') redirect('/onboarding');
  return <OwnerDashboardShell>{children}</OwnerDashboardShell>;
}
