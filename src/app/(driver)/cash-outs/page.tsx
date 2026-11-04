import { CashOutsList } from "@/components/cash-outs/CashOutsList";
import { BackLink } from "@/components/ui/BackLink";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
import { routes } from "@/lib/routes";

export default function CashOutsPage() {
    const cashUp = mockOpenCashUp;

    return (
        <div className="space-y-5">
            <BackLink href={routes.driver.today}>Today</BackLink>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Cash-outs</h1>
                    <p className="mt-1 text-sm text-muted">Cash-up #{cashUp.number}</p>
                </div>
                <div className="w-44 shrink-0">
                    <ButtonLink href={routes.driver.addCashOut} className="gap-2">
                        <Icon name="plus" size={16} />
                        Add cash-out
                    </ButtonLink>
                </div>
            </div>

            <CashOutsList cashOuts={cashUp.cashOuts} total={cashUp.ledger.cashOuts} />
        </div>
    );
}
