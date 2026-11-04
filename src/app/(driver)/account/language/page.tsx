import { LanguageForm } from "@/components/account/LanguageForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockAccount } from "@/lib/mock/account";
import { routes } from "@/lib/routes";

export default function LanguagePage() {
    return (
        <div className="space-y-4 md:space-y-5">
            <PageHeader
                title="Language"
                subtitle="App language"
                phoneBack={{ href: routes.driver.account, label: "Account" }}
            />
            <LanguageForm current={mockAccount.language} />
        </div>
    );
}
