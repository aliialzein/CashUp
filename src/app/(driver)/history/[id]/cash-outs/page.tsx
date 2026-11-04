import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CashOutsTable } from "@/components/cash-outs/CashOutsTable";
import { LockedBadge } from "@/components/history/LockedBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { findMockCashUpDetail } from "@/lib/mock/cash-up-details";
import { routes } from "@/lib/routes";

type LockedCashOutsPageProps = {
    params: Promise<{ id: string }>;
};

const EMPTY = {
    title: "No cash-outs",
    text: "No money left the drawer during this cash-up.",
};

/** Reads the id and shows that cash-up's cash-outs. It lives inside Suspense because `params` is runtime data. */
async function LockedCashOuts({ params }: LockedCashOutsPageProps) {
    const { id } = await params;
    const detail = findMockCashUpDetail(id);
    if (!detail) notFound();

    return (
        <>
            <PageHeader
                back={{ href: routes.driver.historyDetail(detail.id), label: cashUpLabel(detail.number) }}
                title="Cash-outs"
                subtitle={cashUpLabel(detail.number)}
                badge={<LockedBadge />}
            />
            <CashOutsTable cashOuts={detail.cashOuts} empty={EMPTY} />
            <p className="text-center text-sm text-muted">Cash-outs are read-only after the cash-up is submitted.</p>
        </>
    );
}

export default function LockedCashOutsPage({ params }: LockedCashOutsPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-xl bg-subtle" />}>
                <LockedCashOuts params={params} />
            </Suspense>
        </div>
    );
}
