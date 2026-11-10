import React from "react";

interface TopStatsCardsProps {
  toReview: number;
  requestsWaiting: number;
  openNow: number;
}

export default function TopStatsCards({
  toReview,
  requestsWaiting,
  openNow,
}: TopStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Card 1 */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 shadow-sm space-y-2">
        <span className="text-xs font-semibold tracking-wider text-[#475569]">
          TO REVIEW
        </span>
        <div className="text-3xl font-bold text-[#0f172a]">{toReview}</div>
      </div>

      {/* Card 2 */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 shadow-sm space-y-2">
        <span className="text-xs font-semibold tracking-wider text-[#475569]">
          REQUESTS WAITING
        </span>
        <div className="text-3xl font-bold text-[#0f172a]">
          {requestsWaiting}
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-5 shadow-sm space-y-2">
        <span className="text-xs font-semibold tracking-wider text-[#475569]">
          OPEN NOW
        </span>
        <div className="text-3xl font-bold text-[#0f172a]">{openNow}</div>
      </div>
    </div>
  );
}
