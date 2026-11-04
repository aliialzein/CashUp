import { AccountRow } from "@/components/account/AccountRow";
import { AccountSection } from "@/components/account/AccountSection";
import { ProfileCard } from "@/components/account/ProfileCard";
import { SignOutLink } from "@/components/account/SignOutLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCurrentBusiness } from "@/lib/account/currentBusiness";
import { languageName } from "@/lib/account/languages";
import { mockAccount } from "@/lib/mock/account";
import { routes } from "@/lib/routes";

export default function AccountPage() {
    const account = mockAccount;
    const business = getCurrentBusiness(account);

    return (
        <div className="space-y-5">
            <PageHeader title="Account" />

            <div className="mx-auto w-full max-w-140 space-y-5">
                <ProfileCard fullName={account.fullName} email={account.email} role={business.role} />

                <AccountSection label="Business">
                    <AccountRow icon="business" title={business.name} description={`Your role: ${business.role}`} />
                    <AccountRow
                        icon="swap"
                        title="Switch business"
                        description="Move to another business you belong to"
                        href={routes.driver.switchBusiness}
                    />
                </AccountSection>

                <AccountSection label="Preferences and security">
                    <AccountRow
                        icon="globe"
                        title="Language"
                        description="App language"
                        value={languageName(account.language)}
                        href={routes.driver.language}
                    />
                    <AccountRow
                        icon="lock"
                        title="Change password"
                        description="Update your sign-in password"
                        href={routes.driver.password}
                    />
                </AccountSection>

                <SignOutLink />
            </div>
        </div>
    );
}
