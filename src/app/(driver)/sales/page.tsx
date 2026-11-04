import { SalesList } from "@/components/sales/SalesList";
import { SalesTotals } from "@/components/sales/SalesTotals";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BackLink } from "@/components/ui/BackLink";
import { Icon } from "@/components/ui/Icon";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

export default function SalesPage() {
    const cashUp = mockOpenCashUp;

    return (
        <div className="space-y-5">
            <BackLink href={routes.driver.today}>Today</BackLink>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Sales</h1>
                    <p className="mt-1 text-sm text-muted">Cash-up #{cashUp.number}</p>
                </div>
                {/* With no sales yet, "Add first sale" inside the empty card is the only button. */}
                {cashUp.sales.length > 0 && (
                    <div className="w-40 shrink-0">
                        <ButtonLink href={withOrigin(routes.driver.addSale, "sales")} className="gap-2">
                            <Icon name="plus" size={16} />
                            Add sale
                        </ButtonLink>
                    </div>
                )}
            </div>

            <SalesTotals delivered={cashUp.deliveredTotal} waiting={cashUp.waitingTotal} />
            <SalesList sales={cashUp.sales} />
        </div>
    );
}
