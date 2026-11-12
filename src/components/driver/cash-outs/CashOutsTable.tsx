import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { buttonVariantClasses } from "@/components/ui/driver/Button";
import { cashOutReasonLabel } from "@/lib/driver/cash-out/reasonText";
import { formatOutflow, outflowParts } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";

const TH = "h-10 px-5 font-medium whitespace-nowrap";
const TD = "h-14 px-5";

export type EmptyText = { title: string; text: string };

/** The Note column: the note, or for a deleted cash-out why it was deleted. */
function noteCell(cashOut: CashOut): string {
    if (cashOut.isDeleted) return cashOut.cancelReason ? `Deleted: ${cashOut.cancelReason}` : "Deleted";
    return cashOut.note ?? "—";
}

export const TODAY_EMPTY: EmptyText = {
    title: "No cash-outs yet",
    text: "Record money leaving the drawer so your expected cash stays right.",
};

type CashOutsTableProps = {
    cashOuts: CashOut[];
    /** What the empty table says. Defaults to today's wording. */
    empty?: EmptyText;
    /** Only for the open cash-up: adds the Action column with a Delete button on every cash-out that is not deleted. */
    onDelete?: (cashOut: CashOut) => void;
};

/** The cash-outs table. With none, it keeps its header and explains itself inside. */
export function CashOutsTable({ cashOuts, empty = TODAY_EMPTY, onDelete }: CashOutsTableProps) {
    const columnCount = onDelete ? 5 : 4;

    return (
        <Card as="section" aria-label="Cash-outs" className="overflow-hidden">
            <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wider text-muted uppercase">
                    <tr>
                        <th className={`${TH} w-40`}>Reason</th>
                        <th className={`${TH} w-24`}>Time</th>
                        <th className={TH}>Note</th>
                        <th className={`${TH} w-64 text-right`}>Amount</th>
                        {onDelete && <th className={`${TH} w-px text-right`}>Action</th>}
                    </tr>
                </thead>
                <tbody>
                    {cashOuts.length === 0 && (
                        <tr>
                            <td colSpan={columnCount}>
                                <EmptyState bare icon="minus" title={empty.title} text={empty.text} />
                            </td>
                        </tr>
                    )}
                    {cashOuts.map((cashOut) => (
                        <tr key={cashOut.id} className="border-b border-subtle last:border-b-0">
                            <td className={`${TD} font-heading font-semibold whitespace-nowrap`}>{cashOutReasonLabel(cashOut)}</td>
                            <td className={`${TD} font-mono text-[13px] whitespace-nowrap text-muted`}>{cashOut.time}</td>
                            <td className={`${TD} text-muted`}>{noteCell(cashOut)}</td>
                            {/* One line per currency, like the sales tables. */}
                            <td
                                className={`${TD} py-2 text-right font-mono font-semibold whitespace-nowrap ${cashOut.isDeleted ? "text-muted line-through" : "text-danger"}`}
                            >
                                {outflowParts(cashOut.amount).map((part) => (
                                    <span key={part} className="block">
                                        {part}
                                    </span>
                                ))}
                            </td>
                            {onDelete && (
                                <td className={`${TD} w-px text-right whitespace-nowrap`}>
                                    {!cashOut.isDeleted && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(cashOut)}
                                            aria-label={`Delete cash-out ${cashOutReasonLabel(cashOut)} ${formatOutflow(cashOut.amount)}`}
                                            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold ${buttonVariantClasses("dangerOutline")}`}
                                        >
                                            <Icon name="trash" size={16} />
                                            Delete
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
