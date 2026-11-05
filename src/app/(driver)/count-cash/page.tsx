import { COUNT_CASH_FORM_ID } from "@/components/count-cash/formId";
import { CountCashForm } from "@/components/count-cash/CountCashForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
import { routes } from "@/lib/routes";

export default function CountCashPage() {
    const cashUp = mockOpenCashUp;

    return (
        // The bottom padding keeps the last note clear of the tall count bar on the phone.
        <div className="flex flex-col gap-4 pb-24 md:gap-5 md:pb-0 lg:-mx-10">
            <PageHeader
                back={{ href: routes.driver.today, label: "Today" }}
                title="Count cash"
                subtitle={`Cash-up #${cashUp.number} · count the notes in your drawer`}
                phoneSubtitle={`Cash-up #${cashUp.number} · count each note`}
                // Desktop only: the phone saves from the bar at the bottom.
                action={
                    <div className="hidden w-36 shrink-0 md:block">
                        <Button type="submit" form={COUNT_CASH_FORM_ID}>
                            Save count
                        </Button>
                    </div>
                }
            />

            <CountCashForm expected={cashUp.ledger.expected} />
        </div>
    );
}
