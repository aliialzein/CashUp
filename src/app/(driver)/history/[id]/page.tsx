import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CashUpLedger } from "@/components/driver/cash-up/CashUpLedger";
import { CountResult } from "@/components/driver/cash-up/CountResult";
import { LockedNote } from "@/components/driver/cash-up/LockedNote";
import { CashUpStatusBadge } from "@/components/driver/history/CashUpStatusBadge";
import { SalesLinkCard } from "@/components/driver/history/SalesLinkCard";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { cashUpLabel } from "@/lib/driver/cash-up/cashUpLabel";
import { detailSubtitle } from "@/lib/driver/cash-up/detailSubtitle";
import { driverData } from "@/lib/driver/data/driverData";
import { historyOrigin } from "@/lib/driver/navigation/historyOrigin";
import { resolveOrigin, withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

type CashUpDetailPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads the id and where the driver came from, then shows the cash-up. It lives inside Suspense because both are runtime data. */
async function CashUpDetail({ params, searchParams }: CashUpDetailPageProps) {
    const [{ id }, { from }] = await Promise.all([params, searchParams]);
    // BACKEND: one locked cash-up. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const detail = await driverData.getCashUpDetail(id);
    if (!detail) notFound();

    const deliveredCount = detail.sales.filter((sale) => sale.status === "DELIVERED").length;
    // The pages below (Sales, Cash-outs) get the same origin, so their ← comes back here and this ← still goes to the right place.
    const origin = historyOrigin(from);

    return (
        <>
            <PageHeader
                back={{ href: routes.driver.history, label: "History" }}
                phoneBack={resolveOrigin(from, "history")}
                title={cashUpLabel(detail.number)}
                subtitle={detailSubtitle(detail)}
                badge={<CashUpStatusBadge status={detail.status} />}
            />
            <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-5">
                    <CashUpLedger
                        ledger={detail.ledger}
                        cashOutsHref={withOrigin(routes.driver.historyCashOuts(detail.id), origin)}
                    />
                </div>
                <div className="flex flex-col gap-5">
                    <CountResult counted={detail.counted} gap={detail.gap} />
                    <SalesLinkCard
                        href={withOrigin(routes.driver.historySales(detail.id), origin)}
                        deliveredCount={deliveredCount}
                        total={detail.deliveredTotal}
                    />
                </div>
            </div>
            <LockedNote status={detail.status} />
        </>
    );
}

/** Shown while the cash-up loads: the same two-column shape, so the page does not jump. */
function DetailPlaceholder() {
    return (
        <div aria-hidden className="grid gap-5 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl bg-subtle" />
            <div className="h-36 animate-pulse rounded-xl bg-subtle" />
        </div>
    );
}

export default function CashUpDetailPage({ params, searchParams }: CashUpDetailPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<DetailPlaceholder />}>
                <CashUpDetail params={params} searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
