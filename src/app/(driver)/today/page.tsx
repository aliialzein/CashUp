import { CancelCashUp } from "@/components/cash-up/CancelCashUp";
import { CashUpActions } from "@/components/cash-up/CashUpActions";
import { CashUpLedger } from "@/components/cash-up/CashUpLedger";
import { NoOpenCashUp } from "@/components/cash-up/NoOpenCashUp";
import { ReturnedBanner } from "@/components/cash-up/ReturnedBanner";
import { SubmitCashUp } from "@/components/cash-up/SubmitCashUp";
import { SalesSummaryCard } from "@/components/sales/SalesSummaryCard";
import { WaitingSales } from "@/components/sales/WaitingSales";
import { Badge } from "@/components/ui/Badge";
import { canCancelCashUp } from "@/lib/cash-up/canCancelCashUp";
import { lastClosedCashUp } from "@/lib/history/lastClosedCashUp";
import { mockHistory } from "@/lib/mock/history";
import { getOpenCashUp } from "@/lib/mock/today";

export default function TodayPage() {
    const cashUp = getOpenCashUp();
    if (!cashUp) return <NoOpenCashUp last={lastClosedCashUp(mockHistory)} />;

    const waitingSales = cashUp.sales.filter((sale) => sale.status === "TO_DELIVER");

    return (
        <>
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Cash-up #{cashUp.number}</h1>
                    <Badge>Open</Badge>
                </div>
                <span className="text-sm text-muted">Started {cashUp.startedAt}</span>
            </div>

            {cashUp.returned && (
                <div className="mb-5">
                    <ReturnedBanner {...cashUp.returned} />
                </div>
            )}

            <div className="grid grid-cols-2 items-start gap-6">
                <div className="space-y-4">
                    <CashUpLedger ledger={cashUp.ledger} />
                    <SubmitCashUp
                        salesCount={cashUp.salesCount}
                        waitingCount={waitingSales.length}
                        isCounted={cashUp.counted !== null}
                        isReturned={cashUp.status === "RETURNED"}
                    />
                    {canCancelCashUp(cashUp) && <CancelCashUp />}
                </div>

                <div className="space-y-4">
                    <CashUpActions counted={cashUp.counted} expected={cashUp.ledger.expected} />
                    {/* Always shown. With no sales it shows zeros, and Sales stays reachable. */}
                    <SalesSummaryCard count={cashUp.salesCount} total={cashUp.salesTotal} />
                    <WaitingSales sales={waitingSales} />
                </div>
            </div>
        </>
    );
}