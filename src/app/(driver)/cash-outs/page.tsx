import { CashOutsList } from "@/components/driver/cash-outs/CashOutsList";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { routes } from "@/lib/routes";

function AddCashOutLink() {
    return (
        <ButtonLink href={routes.driver.addCashOut} className="gap-2">
            <Icon name="plus" size={18} />
            Add cash-out
        </ButtonLink>
    );
}

export default async function CashOutsPage() {
    // BACKEND: the open cash-up and its cash-outs. With none open, the driver goes to Today.
    const cashUp = await requireOpenCashUp();

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <PageHeader
                back={{ href: routes.driver.today, label: "Today" }}
                title="Cash-outs"
                subtitle={`Cash-up #${cashUp.number}`}
                // Desktop only: the phone has the bar below instead of a button at the top.
                action={
                    <div className="hidden w-44 shrink-0 md:block">
                        <AddCashOutLink />
                    </div>
                }
            />

            <CashOutsList cashOuts={cashUp.cashOuts} total={cashUp.ledger.cashOuts} />

            <div className="md:hidden">
                <BottomBar>
                    <AddCashOutLink />
                </BottomBar>
            </div>
        </div>
    );
}
