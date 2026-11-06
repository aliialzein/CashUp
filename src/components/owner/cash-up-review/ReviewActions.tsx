interface Props {
  pendingRequests: number;
}

export default function ReviewActions({ pendingRequests }: Props) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-xl bg-[#167344] px-5 font-semibold text-white shadow-sm transition hover:bg-[#145B37] active:scale-[0.99]"
        >
          Approve
        </button>

        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-xl border border-[#167344] bg-white px-5 font-semibold text-[#167344] transition hover:bg-[#EAF5ED] active:scale-[0.99]"
        >
          Return with reason
        </button>
      </div>

      <p className="text-sm text-[#718078]">
        {pendingRequests === 0
          ? "All requests have been reviewed."
          : `${pendingRequests} request${pendingRequests === 1 ? "" : "s"} waiting for your decision.`}
      </p>
    </section>
  );
}
