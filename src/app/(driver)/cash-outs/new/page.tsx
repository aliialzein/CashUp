import { AddCashOutForm } from "@/components/cash-outs/AddCashOutForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
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
