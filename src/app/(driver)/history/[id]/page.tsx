import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CashUpLedger } from "@/components/cash-up/CashUpLedger";
import { CountResult } from "@/components/cash-up/CountResult";
import { LockedNote } from "@/components/cash-up/LockedNote";
import { CashUpStatusBadge } from "@/components/history/CashUpStatusBadge";
import { SalesLinkCard } from "@/components/history/SalesLinkCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { detailSubtitle } from "@/lib/cash-up/detailSubtitle";
import { findMockCashUpDetail } from "@/lib/mock/cash-up-details";
import { routes } from "@/lib/routes";

type CashUpDetailPageProps = {
    params: Promise<{ id: string }>;
};

/** Reads the id and shows the cash-up. It lives inside Suspense because `params` is runtime data. */
async function CashUpDetail({ params }: CashUpDetailPageProps) {
    const { id } = await params;
    const detail = findMockCashUpDetail(id);
    if (!detail) notFound();

    const deliveredCount = detail.sales.filter((sale) => sale.status === "DELIVERED").length;

    return (
        <>
            <PageHeader
                back={{ href: routes.driver.history, label: "History" }}
                title={cashUpLabel(detail.number)}
                subtitle={detailSubtitle(detail)}
                badge={<CashUpStatusBadge status={detail.status} />}
            />
            <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-5">
                    <CashUpLedger ledger={detail.ledger} cashOutsHref={routes.driver.historyCashOuts(detail.id)} />
                </div>
                <div className="flex flex-col gap-5">
                    <CountResult counted={detail.counted} gap={detail.gap} />
                    <SalesLinkCard
                        href={routes.driver.historySales(detail.id)}
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

export default function CashUpDetailPage({ params }: CashUpDetailPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<DetailPlaceholder />}>
                <CashUpDetail params={params} />
            </Suspense>
        </div>
    );
}
