import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { CompleteDeliveryForm } from "@/components/driver/sales/CompleteDeliveryForm";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { driverData } from "@/lib/driver/data/driverData";
import { originFromPath, resolveOrigin, withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

type CompleteDeliveryPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads the sale and where the driver came from. It lives inside Suspense because both are runtime data. */
async function CompleteDelivery({ params, searchParams }: CompleteDeliveryPageProps) {
    // BACKEND: the open cash-up, to find the sale in it. With none open, the driver goes to Today.
    // BACKEND: the signed-in member too, for the fee rule (a driver must enter the fee).
    const [{ id }, { from }, cashUp, identity] = await Promise.all([
        params,
        searchParams,
        requireOpenCashUp(),
        driverData.getIdentity(),
    ]);
    const sale = cashUp.sales.find((openSale) => openSale.id === id);

    // Only a sale that is still waiting for delivery can be completed.
    if (!sale || sale.status !== "TO_DELIVER") notFound();

    const origin = resolveOrigin(from, "sales");

    return (
        <>
            <PageHeader
                back={origin}
                title="Complete delivery"
                subtitle={`Sale #${sale.number} · ${sale.clientPhone}`}
                phoneSubtitle={`Sale #${sale.number}`}
            />
            <CompleteDeliveryForm
                sale={sale}
                feeRequired={identity.feeRequired}
                returnHref={origin.href}
                editHref={withOrigin(routes.driver.editSale(sale.id), originFromPath(origin.href) ?? "sales")}
            />
        </>
    );
}

export default function CompleteDeliveryPage(props: CompleteDeliveryPageProps) {
    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-subtle" />}>
                <CompleteDelivery {...props} />
            </Suspense>
        </div>
    );
}
