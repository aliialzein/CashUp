import { AddSaleLink } from "@/components/driver/sales/AddSaleLink";
import { SalesList } from "@/components/driver/sales/SalesList";
import { SalesTotals } from "@/components/driver/sales/SalesTotals";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

export default async function SalesPage() {
    // BACKEND: the open cash-up and its sales. With none open, the driver goes to Today.
    const cashUp = await requireOpenCashUp();

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <PageHeader
                back={{ href: routes.driver.today, label: "Today" }}
                title="Sales"
                subtitle={`Cash-up #${cashUp.number}`}
                // With no sales yet, "Add first sale" inside the empty card is the only desktop button.
                action={
                    cashUp.sales.length > 0 ? (
                        <div className="w-40 shrink-0">
                            <ButtonLink href={withOrigin(routes.driver.addSale, "sales")} className="gap-2">
                                <Icon name="plus" size={16} />
                                Add sale
                            </ButtonLink>
                        </div>
                    ) : undefined
                }
                phoneAction={<AddSaleLink />}
            />

            <SalesTotals delivered={cashUp.deliveredTotal} waiting={cashUp.waitingTotal} />
            <SalesList sales={cashUp.sales} />
        </div>
    );
}
