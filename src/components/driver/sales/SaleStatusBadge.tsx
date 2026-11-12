import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { SaleStatus } from "@/types/driver/cash-up";

const STATUS: Record<SaleStatus, { label: string; tone: BadgeTone; dot: string }> = {
	TO_DELIVER: { label: "To deliver", tone: "warning", dot: "bg-amber-600" },
	DELIVERED: { label: "Delivered", tone: "success", dot: "bg-emerald-600" },
	DELETED: { label: "Deleted", tone: "danger", dot: "bg-danger" },
};

/** The status of a sale. The coloured dot shows on phone only. */
export function SaleStatusBadge({ status }: { status: SaleStatus }) {
	const { label, tone, dot } = STATUS[status];
	return (
		<Badge tone={tone}>
			<span className="inline-flex items-center gap-1.5">
				<span aria-hidden className={`size-1.5 rounded-full ${dot} md:hidden`} />
				{label}
			</span>
		</Badge>
	);
}
