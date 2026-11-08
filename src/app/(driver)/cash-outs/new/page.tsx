import { AddCashOutForm } from "@/components/driver/cash-outs/AddCashOutForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { routes } from "@/lib/routes";

export default async function AddCashOutPage() {
    // BACKEND: the open cash-up, for its number. With none open, the driver goes to Today.
    const cashUp = await requireOpenCashUp();

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <PageHeader
                title="Add cash-out"
                subtitle={`Cash-up #${cashUp.number} · money leaving the drawer`}
                close={{ href: routes.driver.cashOuts }}
            />
            <AddCashOutForm />
        </div>
    );
}
