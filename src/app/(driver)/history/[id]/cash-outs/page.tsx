import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CashOutsResults } from "@/components/driver/cash-outs/CashOutsResults";
import { type EmptyText } from "@/components/driver/cash-outs/CashOutsTable";
import { CashOutsTotal } from "@/components/driver/cash-outs/CashOutsTotal";
import { LockedBadge } from "@/components/driver/history/LockedBadge";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { activeCashOuts } from "@/lib/driver/cash-out/activeCashOuts";
import { cashUpLabel } from "@/lib/driver/cash-up/cashUpLabel";
import { driverData } from "@/lib/driver/data/driverData";
import { historyOrigin } from "@/lib/driver/navigation/historyOrigin";
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
    // BACKEND: one locked cash-up with its cash-outs. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const detail = await driverData.getCashUpDetail(id);
    if (!detail) notFound();
    const shownCashOuts = activeCashOuts(detail.cashOuts);

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
            <CashOutsTotal total={detail.ledger.cashOuts} none={shownCashOuts.length === 0} />
            <CashOutsResults cashOuts={shownCashOuts} empty={EMPTY} />
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
