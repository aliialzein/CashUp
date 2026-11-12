import { Suspense } from "react";
import CashUpList from "@/components/owner/cash-ups/CashUpList";
import { listOwnerCashUps } from "@/modules/cash-ups/cash-ups.service";

async function CashUpsContent() {
  const cashUps = await listOwnerCashUps();
  return <CashUpList cashUps={cashUps} />;
}

export default function CashUpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Cash-ups</h1>
        <p className="mt-2 text-sm text-muted">Review and manage every driver&apos;s cash-ups.</p>
      </div>

      <Suspense fallback={<p role="status" className="text-sm text-muted">Loading cash-ups…</p>}>
        <CashUpsContent />
      </Suspense>
    </div>
  );
}
