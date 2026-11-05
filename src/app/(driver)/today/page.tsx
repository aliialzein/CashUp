import { CancelCashUp } from "@/components/cash-up/CancelCashUp";
import { CashUpActions } from "@/components/cash-up/CashUpActions";
import { CashUpLedger } from "@/components/cash-up/CashUpLedger";
import { NoOpenCashUp } from "@/components/cash-up/NoOpenCashUp";
import { ReturnedBanner } from "@/components/cash-up/ReturnedBanner";
import { SubmitCashUp } from "@/components/cash-up/SubmitCashUp";
import { SalesSummaryCard } from "@/components/sales/SalesSummaryCard";
import { WaitingSales } from "@/components/sales/WaitingSales";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { canCancelCashUp } from "@/lib/cash-up/canCancelCashUp";
import { lastClosedCashUp } from "@/lib/history/lastClosedCashUp";
import { mockHistory } from "@/lib/mock/history";
import { getOpenCashUp } from "@/lib/mock/today";

export default function TodayPage() {
    const cashUp = getOpenCashUp();
    if (!cashUp) return <NoOpenCashUp last={lastClosedCashUp(mockHistory)} />;

    const waitingSales = cashUp.sales.filter((sale) => sale.status === "TO_DELIVER");
    const hasSales = cashUp.salesCount > 0;

    return (
        <>
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
                        isCounted={cashUp.counted !== null}
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
