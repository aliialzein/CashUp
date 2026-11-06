import { Icon } from "@/components/ui/Icon";
import type { CashUpDetail } from "@/types/cash-up";

const NOTES: Record<CashUpDetail["status"], { icon: "lock" | "info"; text: string; tone: string }> = {
    SUBMITTED: {
        icon: "info",
        text: "This cash-up is locked. You will see it here when the owner approves it or sends it back.",
        tone: "border-info-line bg-info-bg text-info",
    },
    APPROVED: {
        icon: "lock",
        text: "Approved and locked. This record can no longer be changed.",
        tone: "border-success-line bg-success-bg text-success",
    },
};

/** Says why the cash-up cannot change. */
export function LockedNote({ status }: { status: CashUpDetail["status"] }) {
    const { icon, text, tone } = NOTES[status];
    return (
        <div role="status" className={`flex items-start gap-3 rounded-xl border px-5 py-3.5 text-sm leading-snug ${tone}`}>
            <Icon name={icon} size={20} className="mt-0.5 shrink-0" />
            <span>{text}</span>
        </div>
    );
}
