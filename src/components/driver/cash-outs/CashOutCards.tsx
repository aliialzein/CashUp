import { Icon } from "@/components/ui/Icon";
import { buttonVariantClasses } from "@/components/ui/driver/Button";
import { cashOutReasonLabel } from "@/lib/driver/cash-out/reasonText";
import { formatOutflow } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";

/** The line under the reason: the time and note, or for a deleted cash-out why it was deleted. */
function detailLine(cashOut: CashOut): string {
    if (cashOut.isDeleted) return cashOut.cancelReason ? `Deleted · ${cashOut.cancelReason}` : "Deleted";
    return cashOut.note ? `${cashOut.time} · ${cashOut.note}` : cashOut.time;
}

type CashOutCardsProps = {
    cashOuts: CashOut[];
    /** Only for the open cash-up: shows a Delete button on every cash-out that is not deleted. */
    onDelete?: (cashOut: CashOut) => void;
};

/** Phone only: one card per cash-out. Reason and amount share the first row; the time and note get the full width below. */
export function CashOutCards({ cashOuts, onDelete }: CashOutCardsProps) {
    return (
        <ul aria-label="Cash-outs" className="flex flex-col gap-2.5">
            {cashOuts.map((cashOut) => (
                <li key={cashOut.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="font-heading text-[15px] font-semibold">{cashOutReasonLabel(cashOut)}</span>
                            <span
                                className={`text-right font-mono text-sm font-semibold whitespace-nowrap ${cashOut.isDeleted ? "text-muted line-through" : "text-danger"}`}
                            >
                                {formatOutflow(cashOut.amount)}
                            </span>
                        </div>
                        <span className="text-[13px] wrap-break-word text-muted">{detailLine(cashOut)}</span>
                    </div>
                    {onDelete && !cashOut.isDeleted && (
                        <button
                            type="button"
                            onClick={() => onDelete(cashOut)}
                            aria-label={`Delete cash-out ${cashOutReasonLabel(cashOut)} ${formatOutflow(cashOut.amount)}`}
                            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${buttonVariantClasses("dangerOutline")}`}
                        >
                            <Icon name="trash" size={18} />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
