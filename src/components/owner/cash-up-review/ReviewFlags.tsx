import {
  RequestStatus,
  RequestType,
  type CashUpCardData,
} from "@/components/owner/cash-up-view-models";

interface Props {
  requests: CashUpCardData["requests"];
}

export default function ReviewFlags({ requests }: Props) {
  return (
    <section className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-[#0f172a]">Requests & Flags</h2>

      {requests.length === 0 ? (
        <p className="text-sm text-[#718078]">No requests for this cash-up.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7FAF8] p-3"
            >
              <div>
                <p className="text-sm font-medium text-[#263B30]">
                  {request.type === RequestType.DELETE_SALE
                    ? "Delete sale"
                    : "Void cash-up"}
                </p>

                <p className="text-xs text-[#718078]">
                  {request.createdAt.toLocaleString()}
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {request.status === RequestStatus.AWAITING_OWNER
                  ? "Awaiting your review"
                  : request.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
