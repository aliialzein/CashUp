import { redirect } from "next/navigation";
import { COUNT_CASH_FORM_ID, SUBMIT_INTENT } from "@/components/driver/count-cash/formId";
import { CountCashForm } from "@/components/driver/count-cash/CountCashForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { Button } from "@/components/ui/driver/Button";
import { submitStep } from "@/lib/driver/cash-up/submitStep";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { routes } from "@/lib/routes";

/** The last step of submitting. Today's Submit button leads here; nothing else does. */
export default async function CountCashPage() {
    // BACKEND: the open cash-up, for its expected cash and saved count. With none open, the driver goes to Today.
    const cashUp = await requireOpenCashUp();

    // Same rule as Today's Submit button: with sales still waiting, Today shows why the count step is not open yet.
    const waitingCount = cashUp.sales.filter((sale) => sale.status === "TO_DELIVER").length;
    if (submitStep(cashUp.salesCount, waitingCount).kind !== "go-to-count") redirect(routes.driver.today);

    return (
        // The bottom padding keeps the last note clear of the tall count bar on the phone.
        <div className="flex flex-col gap-4 pb-24 md:gap-5 md:pb-0 lg:-mx-10">
            <PageHeader
                back={{ href: routes.driver.today, label: "Today" }}
                title="Count cash"
                subtitle={`Cash-up #${cashUp.number} · count the notes in your drawer`}
                phoneSubtitle={`Cash-up #${cashUp.number} · count each note`}
                // Desktop only: the phone saves and submits from the bar at the bottom.
                action={
                    <div className="hidden shrink-0 gap-3 md:flex">
                        <div className="w-36">
                            <Button type="submit" form={COUNT_CASH_FORM_ID} variant="secondary">
                                Save count
                            </Button>
                        </div>
                        <div className="w-44">
                            <Button type="submit" form={COUNT_CASH_FORM_ID} value={SUBMIT_INTENT}>
                                Submit cash-up
                            </Button>
                        </div>
                    </div>
                }
            />

            <CountCashForm expected={cashUp.ledger.expected} savedCounts={cashUp.savedCounts} />
        </div>
    );
}
