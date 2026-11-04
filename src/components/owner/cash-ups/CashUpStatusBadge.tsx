import type { CashUpCardData } from "@/types/cash-up";

type CashUpStatus = CashUpCardData["status"];

const statusStyles: Record<CashUpStatus, { label: string; className: string }> =
  {
    OPEN: {
      label: "Open",
      className: "bg-blue-50 text-blue-700",
    },
    SUBMITTED: {
      label: "Awaiting Review",
      className: "bg-amber-50 text-amber-700",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-green-50 text-green-700",
    },
    VOID: {
      label: "Voided",
      className: "bg-gray-100 text-gray-600",
    },
  };

export default function CashUpStatusBadge({
  status,
}: {
  status: CashUpStatus;
}) {
  const config = statusStyles[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
