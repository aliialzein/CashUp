import { PasswordForm } from "@/components/account/PasswordForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { routes } from "@/lib/routes";

export default function PasswordPage() {
    return (
        <div className="space-y-4 md:space-y-5">
            <PageHeader
                title="Change password"
                subtitle="Keep your account safe"
                phoneBack={{ href: routes.driver.account, label: "Account" }}
            />
            <PasswordForm />
        </div>
    );
}
