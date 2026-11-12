import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { CashUpStatus } from "@/types/driver/cash-up";

type Tone = ComponentProps<typeof Badge>["tone"];

const STATUS_BADGES: Record<CashUpStatus, { label: string; tone: Tone }> = {
    OPEN: { label: "Open", tone: "neutral" },
    SUBMITTED: { label: "Submitted", tone: "info" },
    RETURNED: { label: "Returned", tone: "warning" },
    APPROVED: { label: "Approved", tone: "success" },
};

/** Approved cash-ups are locked, so they carry a lock icon. */
export function CashUpStatusBadge({ status }: { status: CashUpStatus }) {
    const { label, tone } = STATUS_BADGES[status];
    return (
        <Badge tone={tone}>
            <span className="inline-flex items-center gap-1">
                {status === "APPROVED" && <Icon name="lock" size={12} />}
                {label}
            </span>
        </Badge>
    );
}
