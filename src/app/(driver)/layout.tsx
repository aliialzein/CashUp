import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/driver/layout/AppShell";
import { DriverIdentity, DriverIdentityFallback } from "@/components/driver/layout/DriverIdentity";
import { driverNav } from "@/components/driver/layout/navigation";

/**
 * Stays synchronous on purpose: the only part that reads the session (the business and user in the header) sits in
 * its own <Suspense>, so the rest of the frame and every page render without waiting for it, and the build keeps
 * passing under Cache Components (loading.tsx does not cover this layout).
 */
export default function DriverLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell
            nav={driverNav}
            identity={
                <Suspense fallback={<DriverIdentityFallback />}>
                    <DriverIdentity />
                </Suspense>
            }
        >
            {children}
        </AppShell>
    );
}
