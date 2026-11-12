import { driverData } from "@/lib/driver/data/driverData";
import { BusinessSwitcher, BusinessSwitcherFallback } from "./BusinessSwitcher";

/**
 * The business and "<role> · <name>" in the header. It reads the session, so the layout renders it inside its own
 * <Suspense>: loading.tsx does not cover the layout, and Cache Components needs every runtime read in a layout behind
 * a boundary of its own (Next.js docs, layout.md "Interaction with loading.js").
 */
export async function DriverIdentity() {
    // BACKEND: the signed-in member and their business. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const identity = await driverData.getIdentity();
    return <BusinessSwitcher businessName={identity.businessName} userLine={`${identity.roleLabel} · ${identity.userName}`} />;
}

/** While the session is read: the same switcher, still empty, so the header does not jump. */
export function DriverIdentityFallback() {
    return <BusinessSwitcherFallback businessName="" userLine="" />;
}
