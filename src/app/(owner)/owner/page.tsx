import { Suspense } from "react";
import DoneSection from "@/components/owner/home-dashboard/DoneSection";
import NeedsDecisionSection from "@/components/owner/home-dashboard/NeedsDecisionSection";
import OpenNowSection from "@/components/owner/home-dashboard/OpenNowSection";
import TopStatsCards from "@/components/owner/home-dashboard/TopStatsCards";
import { summarizeOwnerHome } from "@/lib/owner/cashUpOverview";
import { listOwnerCashUps } from "@/modules/cash-ups/cash-ups.service";

async function HomeContent() {
  const home = summarizeOwnerHome(await listOwnerCashUps());

  return (
    <>
      <TopStatsCards toReview={home.toReview.length} requestsWaiting={home.waitingRequests} openNow={home.open.length} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NeedsDecisionSection
          cashUpsCount={home.toReview.length}
          cashUpNames={home.toReview.map((cashUp) => cashUp.staffName)}
          requestsCount={home.waitingRequests}
        />
        <OpenNowSection items={home.open} />
      </div>

      <DoneSection approvedCount={home.approvedCount} />
    </>
  );
}

export default function OwnerHomePage() {
  return (
    <div className="space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Home</h1>
      <Suspense fallback={<p role="status" className="text-sm text-muted">Loading your business…</p>}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
