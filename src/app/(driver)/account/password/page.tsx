import { ComingSoonNotice } from "@/components/account/ComingSoonNotice";
import { PasswordForm } from "@/components/account/PasswordForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { routes } from "@/lib/routes";

export default function PasswordPage() {
    return (
        <div className="space-y-4 md:space-y-5">
            <PageHeader
                title="Change password"
                subtitle="Keep your account safe"
                phoneBack={{ href: routes.driver.account, label: "Account" }}
            />
            <ComingSoonNotice>
                Changing your password from the app isn&apos;t available yet. If you need a new one now, contact your
                business owner.
            </ComingSoonNotice>
            {/* Disabled until the backend can change a password (changePassword is on the backend list). */}
            <PasswordForm disabled />
        </div>
    );
}
