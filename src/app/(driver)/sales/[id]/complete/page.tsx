import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { CompleteDeliveryForm } from "@/components/driver/sales/CompleteDeliveryForm";
import { findMockSale } from "@/lib/driver/mock/cash-up";
import { mockSession } from "@/lib/driver/mock/session";
import { resolveOrigin } from "@/lib/navigation/origin";

type CompleteDeliveryPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads the sale and where the driver came from. It lives inside Suspense because both are runtime data. */
async function CompleteDelivery({ params, searchParams }: CompleteDeliveryPageProps) {
    const [{ id }, { from }] = await Promise.all([params, searchParams]);
    const sale = findMockSale(id);

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
            <CompleteDeliveryForm sale={sale} feeRequired={mockSession.role === "DRIVER"} returnHref={origin.href} />
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
