import { CancelCashUp } from "@/components/driver/cash-up/CancelCashUp";
import { CashUpActions } from "@/components/driver/cash-up/CashUpActions";
import { CashUpLedger } from "@/components/driver/cash-up/CashUpLedger";
import { NoOpenCashUp } from "@/components/driver/cash-up/NoOpenCashUp";
import { ReturnedBanner } from "@/components/driver/cash-up/ReturnedBanner";
import { SubmitCashUp } from "@/components/driver/cash-up/SubmitCashUp";
import { SalesSummaryCard } from "@/components/driver/sales/SalesSummaryCard";
import { WaitingSales } from "@/components/driver/sales/WaitingSales";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SuccessNotice } from "@/components/ui/SuccessNotice";
import { todayNotice } from "@/lib/driver/count-cash/todayNotice";
import { canCancelCashUp } from "@/lib/driver/cash-up/canCancelCashUp";
import { lastClosedCashUp } from "@/lib/driver/history/lastClosedCashUp";
import { driverData } from "@/lib/driver/data/driverData";

type TodayPageProps = {
    /** `?done=count-saved` or `?done=submitted` after the count page (see todayNotice.ts). */
    searchParams: Promise<{ done?: string | string[] }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
    // BACKEND: the open cash-up. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const [cashUp, { done }] = await Promise.all([driverData.getOpenCashUp(), searchParams]);
    const notice = todayNotice(done);

    if (!cashUp) {
        // BACKEND: the history, only needed here to show the last closed cash-up.
        const history = await driverData.getHistory();
        return (
            <>
                {notice && <SuccessNotice className="mx-auto mb-5 w-full max-w-160">{notice}</SuccessNotice>}
                <NoOpenCashUp last={lastClosedCashUp(history)} />
            </>
        );
    }

    const waitingSales = cashUp.sales.filter((sale) => sale.status === "TO_DELIVER");
    const hasSales = cashUp.salesCount > 0;

    return (
        <>
            {notice && <SuccessNotice className="mb-5">{notice}</SuccessNotice>}
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">Cash-up #{cashUp.number}</h1>
                    <Badge>Open</Badge>
                </div>
                <span className="text-xs text-muted md:text-sm">
                    <span className="hidden md:inline">Started </span>
                    {cashUp.startedAt}
                </span>
            </div>

            {cashUp.returned && (
                <div className="mb-5">
                    <ReturnedBanner {...cashUp.returned} />
                </div>
            )}

            {/* Phone order: ledger, actions, then Cancel. Desktop: Cancel goes back under Submit, in the left column. */}
            <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 md:gap-x-6 md:gap-y-4">
                {/* flex gap, not space-y: on phone Submit is fixed, and space-y would still leave a margin for it. */}
                <div className="flex flex-col gap-2 md:gap-4 md:col-start-1 md:row-start-1">
                    <CashUpLedger ledger={cashUp.ledger} collapsible />
                    <SubmitCashUp
                        salesCount={cashUp.salesCount}
                        waitingCount={waitingSales.length}
                        isReturned={cashUp.status === "RETURNED"}
                    />
                </div>

                <div className="flex flex-col gap-2 md:gap-4 md:col-start-2 md:row-span-2 md:row-start-1">
                    <CashUpActions counted={cashUp.counted} expected={cashUp.ledger.expected} />
                    {hasSales ? (
                        <SalesSummaryCard count={cashUp.salesCount} total={cashUp.salesTotal} />
                    ) : (
                        <>
                            {/* Phone: a "No sales yet" card, as in the design. Desktop keeps the Sales card with zeros. */}
                            <EmptyState
                                compact
                                icon="tag"
                                title="No sales yet"
                                text="Add your first sale to start this cash-up."
                                className="md:hidden"
                            />
                            <div className="hidden md:block">
                                <SalesSummaryCard count={cashUp.salesCount} total={cashUp.salesTotal} />
                            </div>
                        </>
                    )}
                    <WaitingSales sales={waitingSales} />
                </div>

                {canCancelCashUp(cashUp) && (
                    <div className="md:col-start-1 md:row-start-2">
                        <CancelCashUp />
                    </div>
                )}
            </div>
        </>
    );
}
