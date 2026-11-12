import {
  CashUpStatus,
  RequestStatus,
  RequestType,
  Currency,
} from "@/types/owner/cash-up";
import {
  ChevronRight,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

type CashUpCardProps = {
  cashUp: {
    id: string;
    status: CashUpStatus;
    openedAt: Date;
    selfApproved?: boolean;
    returnReason?: string | null;
    gapUsd?: number | null;
    gapLbp?: number | null;
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
  onAction?: (cashUpId: string) => void;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export default function CashUpCard({ cashUp, onAction }: CashUpCardProps) {
  const shortId = cashUp.id.length > 3 ? cashUp.id.slice(-3) : cashUp.id;

  const getStatusBadge = () => {
    switch (cashUp.status) {
      case CashUpStatus.SUBMITTED:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
            Submitted
          </span>
        );
      case CashUpStatus.OPEN:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
            Open
          </span>
        );
      case CashUpStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
            <Lock className="w-3 h-3 text-[#047857]" /> Approved
          </span>
        );
      case CashUpStatus.VOID:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
            Returned
          </span>
        );
      default:
        return null;
    }
  };

  const getRightSideDisplay = () => {
    if (cashUp.status === CashUpStatus.OPEN) {
      return (
        <span className="text-sm font-medium text-[#475569]">In progress</span>
      );
    }

    if (cashUp.returnReason || cashUp.status === CashUpStatus.VOID) {
      return (
        <span className="text-sm font-medium text-[#b45309]">With driver</span>
      );
    }

    const gapUsd = cashUp.gapUsd ?? 0;
    const gapLbp = cashUp.gapLbp ?? 0;

    if (gapUsd !== 0) {
      return (
        <span
          className={`text-sm font-semibold ${gapUsd < 0 ? "text-[#be123c]" : "text-[#b45309]"}`}
        >
          USD {gapUsd > 0 ? `+${gapUsd}` : gapUsd}
        </span>
      );
    }

    if (gapLbp !== 0) {
      return (
        <span
          className={`text-sm font-semibold ${gapLbp < 0 ? "text-[#be123c]" : "text-[#b45309]"}`}
        >
          LBP {gapLbp.toLocaleString()}
        </span>
      );
    }

    return <span className="text-sm font-medium text-[#047857]">Matches</span>;
  };

  return (
    <div
      onClick={() => onAction?.(cashUp.id)}
      className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:border-[#cbd5e1] transition-all cursor-pointer flex items-center justify-between"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[#0f172a]">Cash-up #{shortId}</h3>
          {getStatusBadge()}
        </div>

        <div className="text-xs text-[#475569] flex items-center gap-1.5 flex-wrap">
          <span>{cashUp.membership?.user?.fullName || "Unknown"}</span>
          <span>·</span>
          <span>{formatDate(cashUp.openedAt)}</span>
          {cashUp.selfApproved && (
            <>
              <span>·</span>
              <span className="italic text-[#475569]">Self-approved</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getRightSideDisplay()}
        <ChevronRight className="w-4 h-4 text-[#475569]" />
      </div>
    </div>
  );
}
