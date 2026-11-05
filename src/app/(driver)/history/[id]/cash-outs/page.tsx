import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CashOutsResults } from "@/components/cash-outs/CashOutsResults";
import { type EmptyText } from "@/components/cash-outs/CashOutsTable";
import { CashOutsTotal } from "@/components/cash-outs/CashOutsTotal";
import { LockedBadge } from "@/components/history/LockedBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { findMockCashUpDetail } from "@/lib/mock/cash-up-details";
import { historyOrigin } from "@/lib/navigation/historyOrigin";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

type LockedCashOutsPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

const EMPTY: EmptyText = {
    title: "No cash-outs",
    text: "No money left the drawer during this cash-up.",
};

/** Reads the id and where the cash-up was opened from, so the ← goes back to the cash-up with the same origin. */
async function LockedCashOuts({ params, searchParams }: LockedCashOutsPageProps) {
    const [{ id }, { from }] = await Promise.all([params, searchParams]);
    const detail = findMockCashUpDetail(id);
    if (!detail) notFound();

    return (
        <>
            <PageHeader
                back={{
                    href: withOrigin(routes.driver.historyDetail(detail.id), historyOrigin(from)),
                    label: cashUpLabel(detail.number),
                }}
                title="Cash-outs"
                subtitle={cashUpLabel(detail.number)}
                badge={<LockedBadge />}
            />
            <CashOutsTotal total={detail.ledger.cashOuts} none={detail.cashOuts.length === 0} />
            <CashOutsResults cashOuts={detail.cashOuts} empty={EMPTY} />
            <p className="text-center text-[13px] text-muted md:text-sm">Cash-outs are read-only after the cash-up is submitted.</p>
        </>
    );
}

export default function LockedCashOutsPage({ params, searchParams }: LockedCashOutsPageProps) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-xl bg-subtle" />}>
                <LockedCashOuts params={params} searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
