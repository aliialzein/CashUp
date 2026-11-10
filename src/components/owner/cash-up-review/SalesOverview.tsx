import Link from "next/link";
import type { CashUpCardData } from "@/components/owner/cash-up-view-models";
import { RequestStatus } from "@/components/owner/cash-up-view-models";

interface Props {
  cashUp: CashUpCardData;
}

export default function SalesOverview({ cashUp }: Props) {
  const pendingSaleRequests = cashUp.requests.filter(
    (request) =>
      request.type === "DELETE_SALE" &&
      request.status === RequestStatus.AWAITING_OWNER,
  );

  return (
    <section className="rounded-2xl border border-[#E2EBE5] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[#0f172a]">Sales Overview</h2>

          <p className="mt-1 text-sm text-[#718078]">
            {cashUp.sales.length} sales recorded in this cash-up
          </p>
        </div>

        <Link
          href={`/owner/cash-ups/${cashUp.id}/sales`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f172a] px-5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
        >
          View All Sales
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#F7FAF8] p-3">
          <p className="text-xs text-[#718078]">Total Sales</p>
          <p className="mt-1 text-xl font-bold text-[#145B37]">
            {cashUp.sales.length}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs text-amber-700">Awaiting Owner</p>
          <p className="mt-1 text-xl font-bold text-amber-800">
            {pendingSaleRequests.length}
          </p>
        </div>
      </div>
    </section>
  );
}
