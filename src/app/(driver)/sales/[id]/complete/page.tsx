import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CompleteDeliveryForm } from "@/components/sales/CompleteDeliveryForm";
import { BackLink } from "@/components/ui/BackLink";
import { findMockSale } from "@/lib/mock/cash-up";
import { mockSession } from "@/lib/mock/session";
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
            <BackLink href={origin.href}>{origin.label}</BackLink>

            <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight">Complete delivery</h1>
                <p className="mt-1 text-sm text-muted">
                    Sale #{sale.number} · {sale.clientPhone}
                </p>
            </div>

            <CompleteDeliveryForm sale={sale} feeRequired={mockSession.role === "DRIVER"} returnHref={origin.href} />
        </>
    );
}

export default function CompleteDeliveryPage(props: CompleteDeliveryPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-subtle" />}>
                <CompleteDelivery {...props} />
            </Suspense>
        </div>
    );
}
