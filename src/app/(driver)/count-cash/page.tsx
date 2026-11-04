import { COUNT_CASH_FORM_ID } from "@/components/count-cash/formId";
import { CountCashForm } from "@/components/count-cash/CountCashForm";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
import { routes } from "@/lib/routes";

export default function CountCashPage() {
    const cashUp = mockOpenCashUp;

    return (
        <div className="space-y-5 lg:-mx-10">
            <BackLink href={routes.driver.today}>Today</BackLink>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Count cash</h1>
                    <p className="mt-1 text-sm text-muted">Cash-up #{cashUp.number} · count the notes in your drawer</p>
                </div>
                <div className="w-36 shrink-0">
                    <Button type="submit" form={COUNT_CASH_FORM_ID}>
                        Save count
                    </Button>
                </div>
            </div>

            <CountCashForm expected={cashUp.ledger.expected} />
        </div>
    );
}
