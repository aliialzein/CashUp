import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { EditSaleForm } from "@/components/driver/sales/EditSaleForm";
import { SaleStatusBadge } from "@/components/driver/sales/SaleStatusBadge";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { resolveOrigin } from "@/lib/navigation/origin";

type EditSalePageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads the sale and where the driver came from. It lives inside Suspense because both are runtime data. */
async function EditSale({ params, searchParams }: EditSalePageProps) {
    // BACKEND: the open cash-up, to find the sale in it. With none open, the driver goes to Today.
    const [{ id }, { from }, cashUp] = await Promise.all([params, searchParams, requireOpenCashUp()]);
    const sale = cashUp.sales.find((openSale) => openSale.id === id);

    // Only a sale that is still "to deliver" can be edited. A delivered sale is final.
    if (!sale || sale.status !== "TO_DELIVER") notFound();

    const origin = resolveOrigin(from, "sales");

    return (
        <>
            <PageHeader
                back={origin}
                title="Edit sale"
                subtitle={`Sale #${sale.number} · ${sale.clientPhone}`}
                phoneSubtitle={`Sale #${sale.number}`}
                badge={<SaleStatusBadge status="TO_DELIVER" />}
            />
            <EditSaleForm sale={sale} returnHref={origin.href} />
        </>
    );
}

export default function EditSalePage(props: EditSalePageProps) {
    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-subtle" />}>
                <EditSale {...props} />
            </Suspense>
        </div>
    );
}
