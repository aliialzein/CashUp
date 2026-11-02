import { CashUpActions } from "@/components/cash-up/CashUpActions";
import { CashUpLedger } from "@/components/cash-up/CashUpLedger";
import { SalesSummaryCard } from "@/components/sales/SalesSummaryCard";
import { WaitingSales } from "@/components/sales/WaitingSales";
import { SubmitCashUp } from "@/components/cash-up/SubmitCashUp";
import { Badge } from "@/components/ui/Badge";
import { mockOpenCashUp } from "@/lib/mock/cash-up";

export default function TodayPage() {
  const cashUp = mockOpenCashUp;
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

      <div className="grid grid-cols-2 items-start gap-6">
        <div className="space-y-4">
          <CashUpLedger ledger={cashUp.ledger} />
          <SubmitCashUp waitingCount={waitingSales.length} />
        </div>

        <div className="space-y-4">
          <CashUpActions />
          <SalesSummaryCard count={cashUp.salesCount} total={cashUp.salesTotal} />
          <WaitingSales sales={waitingSales} />
        </div>
      </div>
    </>
  );
}
