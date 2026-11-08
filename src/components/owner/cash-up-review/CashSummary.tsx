import type { CashUpCardData } from "@/components/owner/cash-up-view-models";

interface Props {
  cashUp: CashUpCardData;
}

const formatMoney = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

function getGapColor(value: number | null) {
  if (value === null) return "text-[#64756A]";
  if (value < 0) return "font-semibold text-red-600";
  if (value > 0) return "font-semibold text-emerald-600";

  return "font-semibold text-[#167344]";
}

export default function CashSummary({ cashUp }: Props) {
  const rows = [
    { label: "Float", usd: cashUp.floatUsd, lbp: cashUp.floatLbp },
    { label: "Expected", usd: cashUp.expectedUsd, lbp: cashUp.expectedLbp },
    { label: "Counted", usd: cashUp.countedUsd, lbp: cashUp.countedLbp },
    { label: "Gap", usd: cashUp.gapUsd, lbp: cashUp.gapLbp },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2EBE5] bg-white shadow-sm">
      <div className="border-b border-[#E5EEE8] bg-[#F7FAF8] px-5 py-4">
        <h2 className="font-semibold text-[#145B37]">Cash Summary</h2>
        <p className="mt-1 text-xs text-[#718078]">Expected vs. counted cash</p>
      </div>

      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-right text-xs font-semibold uppercase tracking-wide text-[#718078]">
              <th className="pb-4 text-left">Details</th>
              <th className="pb-4">USD</th>
              <th className="pb-4">LBP</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isGap = row.label === "Gap";
              const isExpected = row.label === "Expected";

              return (
                <tr
                  key={row.label}
                  className={`border-t border-[#F1F5F2] ${
                    isExpected ? "bg-[#F7FAF8]" : ""
                  } ${isGap ? "bg-[#FAFCFA]" : ""}`}
                >
                  <td
                    className={`py-3 text-left ${
                      isGap
                        ? "font-semibold text-[#145B37]"
                        : isExpected
                          ? "font-semibold text-[#145B37]"
                          : "text-[#64756A]"
                    }`}
                  >
                    {row.label}
                  </td>

                  <td
                    className={`py-3 text-right tabular-nums ${
                      isGap
                        ? getGapColor(row.usd)
                        : isExpected
                          ? "font-semibold text-[#145B37]"
                          : "text-[#263B30]"
                    }`}
                  >
                    {formatMoney(row.usd)}
                  </td>

                  <td
                    className={`py-3 text-right tabular-nums ${
                      isGap
                        ? getGapColor(row.lbp)
                        : isExpected
                          ? "font-semibold text-[#145B37]"
                          : "text-[#263B30]"
                    }`}
                  >
                    {formatMoney(row.lbp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
