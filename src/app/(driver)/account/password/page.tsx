import { PasswordForm } from "@/components/account/PasswordForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PasswordPage() {
    return (
        <div className="space-y-5">
            <PageHeader
                title="Change password"
                subtitle="Keep your account safe"
            />
            <PasswordForm />
        </div>
    );
}
