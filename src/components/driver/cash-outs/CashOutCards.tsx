import { cashOutReasonLabel } from "@/lib/driver/cash-out/reasonText";
import { formatOutflow } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";

/** Phone only: one card per cash-out. Reason and amount share the first row; the time and note get the full width below. */
export function CashOutCards({ cashOuts }: { cashOuts: CashOut[] }) {
    return (
        <ul aria-label="Cash-outs" className="flex flex-col gap-2.5">
            {cashOuts.map((cashOut) => (
                <li key={cashOut.id} className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="font-heading text-[15px] font-semibold">{cashOutReasonLabel(cashOut)}</span>
                        <span className="text-right font-mono text-sm font-semibold whitespace-nowrap text-danger">
                            {formatOutflow(cashOut.amount)}
                        </span>
                    </div>
                    <span className="text-[13px] wrap-break-word text-muted">
                        {cashOut.time}
                        {cashOut.note ? ` · ${cashOut.note}` : ""}
                    </span>
                </li>
            ))}
        </ul>
    );
}
