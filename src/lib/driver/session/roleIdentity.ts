import type { CurrentMember } from "@/modules/auth/auth.types";

/** The backend's member roles: OWNER, MANAGER, STAFF. */
type MembershipRole = CurrentMember["role"];

/** What the driver pages need to know about the signed-in member's role. */
export type RoleIdentity = {
    /** First part of the header line, e.g. "Driver" in "Driver · Mohamad". */
    roleLabel: string;
    /** Complete delivery: a driver must enter the delivery fee; others may leave it empty. */
    feeRequired: boolean;
};

/** The backend has no driver or cashier role: a STAFF member is the driver (team decision, run 8). */
const ROLE_IDENTITY: Record<MembershipRole, RoleIdentity> = {
    STAFF: { roleLabel: "Driver", feeRequired: true },
    MANAGER: { roleLabel: "Manager", feeRequired: false },
    OWNER: { roleLabel: "Owner", feeRequired: false },
};

export function roleIdentity(role: MembershipRole): RoleIdentity {
    return ROLE_IDENTITY[role];
}
