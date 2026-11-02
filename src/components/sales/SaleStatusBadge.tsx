import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { SaleStatus } from "@/types/cash-up";

const STATUS: Record<SaleStatus, { label: string; tone: BadgeTone }> = {
  TO_DELIVER: { label: "To deliver", tone: "warning" },
  DELIVERED: { label: "Delivered", tone: "success" },
  DELETED: { label: "Deleted", tone: "danger" },
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const { label, tone } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
