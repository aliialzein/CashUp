import React from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface NeedsDecisionProps {
  cashUpsCount: number;
  cashUpNames: string[];
  requestsCount: number;
  requestsDescription: string;
}

export default function NeedsDecisionSection({
  cashUpsCount,
  cashUpNames,
  requestsCount,
  requestsDescription,
}: NeedsDecisionProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        NEEDS YOUR DECISION
      </h2>

      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl shadow-sm divide-y divide-[#e2e8f0]">
        {/* Row 1: Cash-ups to review */}
        <div
          onClick={() => router.push("/owner/cash-ups")}
          className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#f1f5f9] transition cursor-pointer"
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-[#0f172a]">Cash-ups to review</h3>
            <p className="text-sm text-[#475569]">{cashUpNames.join(", ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f172a] text-xs font-bold text-white">
              {cashUpsCount}
            </span>
            <ChevronRight className="w-5 h-5 text-[#475569]" />
          </div>
        </div>

        {/* Row 2: Requests */}
        <div
          onClick={() => router.push("/owner/cash-ups")}
          className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#f1f5f9] transition cursor-pointer"
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-[#0f172a]">Requests</h3>
            <p className="text-sm text-[#475569]">{requestsDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fde68a] text-xs font-bold text-[#b45309]">
              {requestsCount}
            </span>
            <ChevronRight className="w-5 h-5 text-[#475569]" />
          </div>
        </div>
      </div>
    </div>
  );
}
