interface Props {
  pendingRequests: number;
}

export default function ReviewActions({ pendingRequests }: Props) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-xl bg-[#0f172a] px-5 font-semibold text-white shadow-sm transition hover:bg-[#1e293b] active:scale-[0.99]"
        >
          Approve
        </button>

        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-5 font-semibold text-[#0f172a] transition hover:bg-[#f1f5f9] active:scale-[0.99]"
        >
          Return with reason
        </button>
      </div>

      <p className="text-sm text-[#475569]">
        {pendingRequests === 0
          ? "All requests have been reviewed."
          : `${pendingRequests} request${pendingRequests === 1 ? "" : "s"} waiting for your decision.`}
      </p>
    </section>
  );
}
