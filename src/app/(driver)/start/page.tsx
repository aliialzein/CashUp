import { StartCashUpForm } from "@/components/driver/cash-up/StartCashUpForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { mockFloatSuggestion } from "@/lib/driver/mock/start-cash-up";
import { mockSession } from "@/lib/driver/mock/session";
import { routes } from "@/lib/routes";

export const metadata = { title: "Start cash-up · CashUp" };

export default function StartCashUpPage() {
    return (
        <div className="mx-auto w-full max-w-140 space-y-4 md:space-y-5">
            <PageHeader
                title="Start cash-up"
                phoneSubtitle={mockSession.businessName}
                close={{ href: routes.driver.today }}
            />
            <StartCashUpForm suggestion={mockFloatSuggestion} />
        </div>
    );
}
