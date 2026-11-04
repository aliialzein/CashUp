import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LockedBadge } from "@/components/history/LockedBadge";
import { LockedSalesTable } from "@/components/history/LockedSalesTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { formatAmounts } from "@/lib/format/money";
import { findMockCashUpDetail } from "@/lib/mock/cash-up-details";
import { routes } from "@/lib/routes";

type LockedSalesPageProps = {
    params: Promise<{ id: string }>;
};

async function LockedSales({ params }: LockedSalesPageProps) {
    const { id } = await params;
    const detail = findMockCashUpDetail(id);
    if (!detail) notFound();

    const deliveredCount = detail.sales.filter((sale) => sale.status === "DELIVERED").length;

    return (
        <>
            <PageHeader
                back={{ href: routes.driver.historyDetail(detail.id), label: cashUpLabel(detail.number) }}
                title="Sales"
                subtitle={cashUpLabel(detail.number)}
                badge={<LockedBadge />}
            />
            <Card className="flex items-center justify-between px-5 py-3.5">
                <span className="text-xs font-medium tracking-wider text-muted uppercase">Delivered · {deliveredCount}</span>
                <span className="font-mono text-xl font-semibold text-success">{formatAmounts(detail.deliveredTotal)}</span>
            </Card>
            <LockedSalesTable sales={detail.sales} />
            <p className="text-center text-sm text-muted">Sales are read-only after the cash-up is submitted.</p>
        </>
    );
}

export default function LockedSalesPage({ params }: LockedSalesPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-xl bg-subtle" />}>
                <LockedSales params={params} />
            </Suspense>
        </div>
    );
}
