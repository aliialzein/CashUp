"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import CashUpCard from "@/components/owner/cash-ups/CashUpCard";
import { mockCashUps } from "@/data/mock/cash-ups";
import {
  CashUpCardData,
  CashUpStatus,
  RequestStatus,
} from "@/types/owner/cash-up";

type FilterType =
  | "ALL"
  | "TO_REVIEW"
  | "OPEN"
  | "RETURNED"
  | "APPROVED"
  | "HAS_GAP";

export default function CashUpsPage() {
  const router = useRouter();
  const cashUps = mockCashUps;

  const [activeFilter, setActiveFilter] = useState<FilterType>("TO_REVIEW");

  const filteredCashUps = useMemo(() => {
    return cashUps.filter((item) => {
      switch (activeFilter) {
        case "TO_REVIEW":
          return item.status === CashUpStatus.SUBMITTED;
        case "OPEN":
          return item.status === CashUpStatus.OPEN;
        case "RETURNED":
          return (
            item.status === CashUpStatus.VOID || Boolean(item.returnReason)
          );
        case "APPROVED":
          return item.status === CashUpStatus.APPROVED;
        case "HAS_GAP":
          const gapUsd = item.gapUsd ?? 0;
          const gapLbp = item.gapLbp ?? 0;
          return gapUsd !== 0 || gapLbp !== 0;
        case "ALL":
        default:
          return true;
      }
    });
  }, [cashUps, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">
          Cash-ups
        </h1>
        <p className="mt-2 text-sm text-[#718077]">
          Review and manage all cash handling periods.
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "ALL", label: "All" },
          { id: "TO_REVIEW", label: "To review" },
          { id: "OPEN", label: "Open" },
          { id: "RETURNED", label: "Returned" },
          { id: "APPROVED", label: "Approved" },
          { id: "HAS_GAP", label: "Has gap" },
        ].map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as FilterType)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                isActive
                  ? "bg-[#0f172a] text-white border-[#0f172a] shadow-sm"
                  : "bg-[#ffffff] text-[#475569] border-[#e2e8f0] hover:bg-[#f1f5f9]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Cash-ups List */}
      {filteredCashUps.length > 0 ? (
        <div className="space-y-4">
          {filteredCashUps.map((cashUp) => (
            <CashUpCard
              key={cashUp.id}
              cashUp={cashUp}
              //actionLabel={getActionLabel(cashUp)}
              onAction={(id) => {
                if (cashUp.status === CashUpStatus.SUBMITTED) {
                  router.push(`/owner/cash-ups/${id}/review`);
                  return;
                }

                // router.push(`/owner/cash-ups/${id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C9DED0] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5ED] text-2xl text-[#167344]">
            ▤
          </div>

          <h2 className="mt-4 font-semibold text-[#145B37]">
            No cash-ups found
          </h2>

          <p className="mt-2 text-sm text-[#718077]">
            No cash-ups match the selected filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
