import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";

type DeliveredTotalRowProps = {
    /** e.g. "Delivered · 3" */
    label: string;
    total: Amounts;
};

/** Phone only: the label and both amounts on one line. */
export function DeliveredTotalRow({ label, total }: DeliveredTotalRowProps) {
    return (
        <Card className="mt-1 flex items-center justify-between gap-2 px-4 py-3 md:hidden">
            <span className="text-xs font-medium tracking-wider text-muted uppercase">{label}</span>
            <span className="font-mono text-sm font-semibold text-success">{formatAmounts(total)}</span>
        </Card>
    );
}
