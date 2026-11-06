import { CashUpStatus, RequestStatus, RequestType } from "@/types/cash-up";

import { Button } from "@/components/ui/Button";

type CashUpCardProps = {
  cashUp: {
    id: string;
    status: CashUpStatus;
    openedAt: Date;
    membership: {
      user: {
        fullName: string;
      };
    };
    requests: {
      type: RequestType;
      status: RequestStatus;
      createdAt: Date;
    }[];
  };
  actionLabel: string;
  onAction: (cashUpId: string) => void;
};

const cashUpStatusLabels: Record<CashUpStatus, string> = {
  OPEN: "Open",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  VOID: "Voided",
};

const requestTypeLabels: Record<RequestType, string> = {
  DELETE_SALE: "Delete sale request",
  VOID_CASHUP: "Void cash-up request",
};

const requestStatusLabels: Record<RequestStatus, string> = {
  AWAITING_OWNER: "Pending your review",
  APPROVED: "Approved",
  REJECTED: "Declined",
  WITHDRAWN: "Withdrawn",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CashUpCard({
  cashUp,
  actionLabel,
  onAction,
}: CashUpCardProps) {
  const latestRequest = cashUp.requests[0];

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-[#DCE9E0] bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-4">
        {/* Employee and date */}
        <div>
          <h3 className="truncate text-base font-semibold text-[#145B37]">
            {cashUp.membership.user.fullName}
          </h3>

          <p className="mt-1 text-sm text-[#718077]">
            Opened {formatDate(cashUp.openedAt)}
          </p>
        </div>

        {/* Cash-up status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#EAF5ED] px-3 py-1 text-xs font-semibold text-[#167344]">
            {cashUpStatusLabels[cashUp.status]}
          </span>
        </div>

        {/* Latest activity */}
        <div className="rounded-xl bg-[#F7FAF8] p-3">
          <p className="text-xs font-medium text-[#718077]">Latest activity</p>

          {latestRequest ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#145B37]">
                {requestTypeLabels[latestRequest.type]}
              </span>

              <span className="text-xs text-[#718077]">
                · {requestStatusLabels[latestRequest.status]}
              </span>
            </div>
          ) : cashUp.status === "SUBMITTED" ? (
            <p className="mt-1 text-sm font-semibold text-[#145B37]">
              Cash-up submitted
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#718077]">No requests yet</p>
          )}
        </div>
      </div>

      {/* Parent controls the action */}
      <div className="shrink-0">
        <Button
          variant="primary"
          onClick={() => onAction(cashUp.id)}
          className="bg-[#167344] shadow-sm shadow-[#167344]/20 hover:bg-[#145B37] focus-visible:ring-[#167344]/40"
        >
          {actionLabel}
        </Button>
      </div>
    </article>
  );
}
