import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LockedBadge } from "@/components/history/LockedBadge";
import { LockedSalesTable } from "@/components/history/LockedSalesTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaleCards } from "@/components/sales/SaleCards";
import { Card } from "@/components/ui/Card";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { formatAmounts } from "@/lib/format/money";
import { findMockCashUpDetail } from "@/lib/mock/cash-up-details";
import { historyOrigin } from "@/lib/navigation/historyOrigin";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

type LockedSalesPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads the id and where the cash-up was opened from, so the ← goes back to the cash-up with the same origin. */
async function LockedSales({ params, searchParams }: LockedSalesPageProps) {
    const [{ id }, { from }] = await Promise.all([params, searchParams]);
    const detail = findMockCashUpDetail(id);
    if (!detail) notFound();

    const deliveredCount = detail.sales.filter((sale) => sale.status === "DELIVERED").length;
    const deliveredLabel = `Delivered · ${deliveredCount}`;

    return (
        <>
            <PageHeader
                back={{
                    href: withOrigin(routes.driver.historyDetail(detail.id), historyOrigin(from)),
                    label: cashUpLabel(detail.number),
                }}
                title="Sales"
                subtitle={cashUpLabel(detail.number)}
                badge={<LockedBadge />}
            />

            <Card className="mt-1 flex items-center justify-between gap-2 px-4 py-3 md:hidden">
                <span className="text-xs font-medium tracking-wider text-muted uppercase">{deliveredLabel}</span>
                <span className="font-mono text-sm font-semibold text-success">{formatAmounts(detail.deliveredTotal)}</span>
            </Card>
            <Card className="hidden items-center justify-between px-5 py-3.5 md:flex">
                <span className="text-xs font-medium tracking-wider text-muted uppercase">{deliveredLabel}</span>
                <span className="font-mono text-xl font-semibold text-success">{formatAmounts(detail.deliveredTotal)}</span>
            </Card>

            <div className="md:hidden">
                <SaleCards sales={detail.sales} />
            </div>
            <div className="hidden md:block">
                <LockedSalesTable sales={detail.sales} />
            </div>

            <p className="text-center text-[13px] text-muted md:text-sm">Sales are read-only after the cash-up is submitted.</p>
        </>
    );
}

export default function LockedSalesPage({ params, searchParams }: LockedSalesPageProps) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-xl bg-subtle" />}>
                <LockedSales params={params} searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
