import { ComingSoonNotice } from "@/components/account/ComingSoonNotice";
import { LanguageForm } from "@/components/account/LanguageForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { DEFAULT_LANGUAGE } from "@/lib/account/languages";
import { routes } from "@/lib/routes";

export default function LanguagePage() {
    return (
        <div className="space-y-4 md:space-y-5">
            <PageHeader
                title="Language"
                subtitle="App language"
                phoneBack={{ href: routes.driver.account, label: "Account" }}
            />
            <ComingSoonNotice>CashUp is in English for now. Arabic and French are coming.</ComingSoonNotice>
            {/* Disabled until the app has translations and the backend stores a language. */}
            <LanguageForm current={DEFAULT_LANGUAGE} disabled />
        </div>
    );
}
