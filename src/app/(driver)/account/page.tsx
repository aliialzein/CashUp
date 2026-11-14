import { Suspense } from "react";
import { AccountNotice } from "@/components/account/AccountNotice";
import { AccountRow } from "@/components/account/AccountRow";
import { AccountSection } from "@/components/account/AccountSection";
import { ProfileCard } from "@/components/account/ProfileCard";
import { SignOutButton } from "@/components/account/SignOutButton";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { DEFAULT_LANGUAGE, languageName } from "@/lib/account/languages";
import { driverData } from "@/lib/driver/data/driverData";
import { routes } from "@/lib/routes";

/** Shown on rows whose page exists but whose feature is not available yet. */
const COMING_SOON = "Coming soon";

/** The signed-in member and their business are runtime data (session and database), so they load inside Suspense. */
async function AccountContent() {
    const identity = await driverData.getIdentity();

    return (
        <>
            <ProfileCard fullName={identity.userName} email={identity.email} role={identity.roleLabel} />

            <AccountSection label="Business">
                <AccountRow icon="business" title={identity.businessName} description={`Your role: ${identity.roleLabel}`} />
                <AccountRow
                    icon="swap"
                    title="Switch business"
                    description="Move to another business you belong to"
                    href={routes.driver.switchBusiness}
                    badge={COMING_SOON}
                />
            </AccountSection>

            <AccountSection label="Preferences and security">
                <AccountRow
                    icon="globe"
                    title="Language"
                    description="App language"
                    value={languageName(DEFAULT_LANGUAGE)}
                    href={routes.driver.language}
                    badge={COMING_SOON}
                />
                <AccountRow
                    icon="lock"
                    title="Change password"
                    description="Update your sign-in password"
                    href={routes.driver.password}
                />
            </AccountSection>
        </>
    );
}

function AccountFallback() {
    return (
        <>
            <div aria-hidden className="h-56 animate-pulse rounded-xl bg-subtle" />
            <div aria-hidden className="h-40 animate-pulse rounded-xl bg-subtle" />
            <p role="status" className="sr-only">
                Loading your account…
            </p>
        </>
    );
}

type AccountPageProps = {
    /** `?done=password-changed` after Change password (see accountNotice.ts). */
    searchParams: Promise<{ done?: string | string[] }>;
};

export default function AccountPage({ searchParams }: AccountPageProps) {
    return (
        <div className="space-y-5">
            <PageHeader title="Account" />

            <div className="mx-auto w-full max-w-140 space-y-5">
                <AccountNotice searchParams={searchParams} />
                <Suspense fallback={<AccountFallback />}>
                    <AccountContent />
                </Suspense>

                <SignOutButton />
            </div>
        </div>
    );
}
