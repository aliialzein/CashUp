import React from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DoneSection() {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        DONE
      </h2>

      <div
        onClick={() => router.push("/owner/cash-ups")}
        className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between hover:bg-[#f1f5f9] transition cursor-pointer"
      >
        <div className="space-y-1">
          <h3 className="font-semibold text-[#0f172a]">Approved cash-ups</h3>
          <p className="text-sm text-[#475569]">Locked and final</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
            Approved
          </span>
          <ChevronRight className="w-5 h-5 text-[#475569]" />
        </div>
      </div>
    </div>
  );
}
