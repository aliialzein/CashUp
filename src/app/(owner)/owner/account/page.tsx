import { Suspense } from "react";
import { Send, Users } from "lucide-react";
import { AccountLinkRow } from "@/components/owner/account/AccountLinkRow";
import { OwnerProfileCard } from "@/components/owner/account/OwnerProfileCard";
import { OwnerSignOutButton } from "@/components/owner/account/OwnerSignOutButton";
import { SoloBusinessCard } from "@/components/owner/account/SoloBusinessCard";
import { routes } from "@/lib/routes";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { getBusiness, listMembers } from "@/modules/business/business.service";

const ROLE_LABEL = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
} as const;

/** Runtime data (session + database), so it sits inside <Suspense>. */
async function AccountContent() {
  const [user, business, members] = await Promise.all([
    getCurrentUser(),
    getBusiness(),
    listMembers(),
  ]);
  if (!user) return null; // the owner layout already redirects signed-out users to /login

  // Active members other than the owner: the people the backend counts before it allows "solo".
  const activeStaff = members.filter(
    (member) => member.status === "ACTIVE" && member.role !== "OWNER",
  ).length;

  return (
    <div className="mx-auto w-full max-w-140 space-y-5">
      <OwnerProfileCard
        fullName={user.fullName}
        email={user.email}
        role={ROLE_LABEL[business.role]}
      />

      <section aria-labelledby="business-label" className="space-y-2">
        <h2
          id="business-label"
          className="text-xs font-medium tracking-wider text-muted uppercase"
        >
          Business
        </h2>
        <div className="divide-y divide-subtle overflow-hidden rounded-xl border border-line bg-surface">
          <SoloBusinessCard
            businessName={business.name}
            isSolo={business.isSolo}
            otherActiveMembers={activeStaff}
          />
          {!business.isSolo && (
            <>
              <AccountLinkRow
                icon={Users}
                title="Team"
                description={`${activeStaff} active ${activeStaff === 1 ? "member" : "members"}`}
                href={routes.owner.team}
              />
              <AccountLinkRow
                icon={Send}
                title="Invite staff"
                description="Create a one-time join code"
                href={routes.owner.invite}
              />
            </>
          )}
        </div>
      </section>

      <OwnerSignOutButton />
    </div>
  );
}

function AccountFallback() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-140 space-y-5">
      <div className="h-44 animate-pulse rounded-xl bg-subtle" />
      <div className="h-40 animate-pulse rounded-xl bg-subtle" />
      <div className="h-12 animate-pulse rounded-xl bg-subtle" />
    </div>
  );
}

export default function OwnerAccountPage() {
  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Account</h1>
      <Suspense fallback={<AccountFallback />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
