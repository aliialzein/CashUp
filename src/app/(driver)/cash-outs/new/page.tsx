import { AddCashOutForm } from "@/components/driver/cash-outs/AddCashOutForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { mockOpenCashUp } from "@/lib/driver/mock/cash-up";
import { routes } from "@/lib/routes";

export default function AddCashOutPage() {
    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <PageHeader
                title="Add cash-out"
                subtitle={`Cash-up #${mockOpenCashUp.number} · money leaving the drawer`}
                close={{ href: routes.driver.cashOuts }}
            />
            <AddCashOutForm />
        </div>
    );
}
