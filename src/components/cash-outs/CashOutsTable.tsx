import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatOutflow } from "@/lib/format/money";
import type { CashOut } from "@/types/cash-up";

const TH = "h-10 px-5 font-medium";
const TD = "h-14 px-5";

export export type EmptyText = { title: string; text: string };

export const TODAY_EMPTY: EmptyText = {
    title: "No cash-outs yet",
    text: "Record money leaving the drawer so your expected cash stays right.",
};

type CashOutsTableProps = {
    cashOuts: CashOut[];
    /** What the empty table says. Defaults to today's wording. */
    empty?: EmptyText;
};

/** The cash-outs table. With none, it keeps its header and explains itself inside. */
export function CashOutsTable({ cashOuts, empty = TODAY_EMPTY }: CashOutsTableProps) {
    return (
        <Card as="section" aria-label="Cash-outs" className="overflow-hidden">
            <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wider text-muted uppercase">
                    <tr>
                        <th className={`${TH} w-40`}>Reason</th>
                        <th className={`${TH} w-24`}>Time</th>
                        <th className={TH}>Note</th>
                        <th className={`${TH} w-64 text-right`}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {cashOuts.length === 0 && (
                        <tr>
                            <td colSpan={4}>
                                <EmptyState bare icon="minus" title={empty.title} text={empty.text} />
                            </td>
                        </tr>
                    )}
                    {cashOuts.map((cashOut) => (
                        <tr key={cashOut.id} className="border-b border-subtle last:border-b-0">
                            <td className={`${TD} font-heading font-semibold`}>{cashOut.reason}</td>
                            <td className={`${TD} font-mono text-[13px] text-muted`}>{cashOut.time}</td>
                            <td className={`${TD} text-muted`}>{cashOut.note ?? "—"}</td>
                            <td className={`${TD} text-right font-mono font-semibold whitespace-nowrap text-danger`}>
                                {formatOutflow(cashOut.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
