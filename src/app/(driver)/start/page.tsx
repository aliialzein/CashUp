import { PageHeader } from "@/components/layout/PageHeader";
import { StartCashUpForm } from "@/components/cash-up/StartCashUpForm";
import { StartSteps } from "@/components/cash-up/StartSteps";
import { mockFloatSuggestion } from "@/lib/mock/start-cash-up";

export const metadata = { title: "Start cash-up · CashUp" };

export default function StartCashUpPage() {
    return (
        <div className="mx-auto w-full max-w-225 space-y-5">
            <PageHeader title="Start cash-up" />
            <div className="grid items-start gap-5 md:grid-cols-[1fr_1.2fr]">
                <StartSteps />
                <StartCashUpForm suggestion={mockFloatSuggestion} />
            </div>
        </div>
    );
}
