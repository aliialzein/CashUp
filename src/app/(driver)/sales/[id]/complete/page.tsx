import { notFound } from "next/navigation";
import { CompleteDeliveryForm } from "@/components/sales/CompleteDeliveryForm";
import { BackLink } from "@/components/ui/BackLink";
import { findMockSale } from "@/lib/mock/cash-up";
import { mockSession } from "@/lib/mock/session";
import { routes } from "@/lib/routes";

export default async function CompleteDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const sale = findMockSale(id);

    // Only a sale that is still waiting for delivery can be completed.
    if (!sale || sale.status !== "TO_DELIVER") notFound();

    return (
        <div className="space-y-5">
            <BackLink href={routes.driver.sales}>Sales</BackLink>

            <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight">Complete delivery</h1>
                <p className="mt-1 text-sm text-muted">
                    Sale #{sale.number} · {sale.clientPhone}
                </p>
            </div>

            <CompleteDeliveryForm sale={sale} feeRequired={mockSession.role === "DRIVER"} />
        </div>
    );
}
