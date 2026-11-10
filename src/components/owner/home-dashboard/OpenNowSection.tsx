import React from "react";
import { useRouter } from "next/navigation";

interface OpenCashUpItem {
  id: string;
  fullName: string;
  since: string;
  salesCount: number;
}

interface OpenNowProps {
  items: OpenCashUpItem[];
}

export default function OpenNowSection({ items }: OpenNowProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        OPEN NOW
      </h2>

      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-2xl shadow-sm divide-y divide-[#e2e8f0]">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#f1f5f9] transition"
          >
            <div className="space-y-1">
              <h3 className="font-semibold text-[#0f172a]">{item.fullName}</h3>
              <p className="text-sm text-[#475569]">
                Since {item.since} · {item.salesCount} sale
                {item.salesCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              onClick={() => router.push(`/owner/cash-ups/${item.id}`)}
              className="px-4 py-1.5 rounded-xl border border-[#e2e8f0] bg-[#ffffff] text-sm font-semibold text-[#0f172a] hover:bg-[#f1f5f9] transition"
            >
              Open
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#475569] px-1">
        You see the details once they submit.
      </p>
    </div>
  );
}
