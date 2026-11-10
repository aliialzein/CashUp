"use client";

import React from "react";
import DoneSection from "@/components/owner/home-dashboard/DoneSection";
import NeedsDecisionSection from "@/components/owner/home-dashboard/NeedsDecisionSection";
import OpenNowSection from "@/components/owner/home-dashboard/OpenNowSection";
import TopStatsCards from "@/components/owner/home-dashboard/TopStatsCards";
import { mockHomeData } from "@/data/mock/owner-dashboard";

export default function OwnerHomePage() {
  const data = mockHomeData;

  return (
    <div className="space-y-8 bg-[#f8fafc] min-h-screen text-[#0f172a] pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">Home</h1>
      </div>

      {/* Top 3 Stat Blocks */}
      <TopStatsCards
        toReview={data.stats.toReview}
        requestsWaiting={data.stats.requestsWaiting}
        openNow={data.stats.openNow}
      />

      {/* Middle Grid Section: Needs Decision & Open Now */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsDecisionSection
          cashUpsCount={data.cashUpsToReview.count}
          cashUpNames={data.cashUpsToReview.names}
          requestsCount={data.requests.count}
          requestsDescription={data.requests.description}
        />

        <OpenNowSection items={data.openCashUps} />
      </div>

      {/* Bottom Section: Done */}
      <DoneSection />
    </div>
  );
}
