import { LanguageForm } from "@/components/account/LanguageForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockAccount } from "@/lib/mock/account";

export default function LanguagePage() {
    return (
        <div className="space-y-5">
            <PageHeader title="Language" subtitle="App language" />
            <LanguageForm current={mockAccount.language} />
        </div>
    );
}
