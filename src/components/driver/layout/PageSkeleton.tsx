import { ROW, SUMMARY_ROW } from "@/components/driver/cash-up/ledgerStyles";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/** The label bar of each ledger row, in Today's order (Float, Received, Change given, Cash-outs). */
const LEDGER_LABEL_WIDTHS = ["w-12", "w-20", "w-24", "w-16"];
/** The title bar of each list card, so the three cards do not look copied. */
const LIST_TITLE_WIDTHS = ["w-24", "w-28", "w-20"];

/**
 * The loading state of every driver page, shaped like Today: the title row, the drawer ledger, the actions and a
 * short list. Same widths, gaps and breakpoint as the Today page (one column on phone, two from md up), so the page
 * does not jump when it arrives. Screen readers hear "Loading…" once; every shape is hidden from them.
 */
export function PageSkeleton() {
    return (
        <div aria-busy="true">
            <p role="status" className="sr-only">
                Loading…
            </p>

            <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-[22px] w-[150px]" />
                <Skeleton soft className="h-3 w-[180px]" />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 md:gap-x-6 md:gap-y-4">
                <Card className="overflow-hidden">
                    {LEDGER_LABEL_WIDTHS.map((labelWidth) => (
                        <div key={labelWidth} className={`${ROW} min-h-11 border-b border-subtle`}>
                            <Skeleton className={`h-3.5 ${labelWidth}`} />
                            <Skeleton className="h-3.5 w-14 justify-self-end" />
                            <Skeleton className="h-3.5 w-20 justify-self-end" />
                        </div>
                    ))}
                    <div className={SUMMARY_ROW}>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16 justify-self-end" />
                        <Skeleton className="h-4 w-24 justify-self-end" />
                    </div>
                </Card>

                <div className="flex flex-col gap-2 md:gap-4">
                    <div className="space-y-3">
                        <Skeleton className="h-[52px] w-full rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                            <Skeleton soft className="h-11 w-full rounded-xl" />
                            <Skeleton soft className="h-11 w-full rounded-xl" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {LIST_TITLE_WIDTHS.map((titleWidth) => (
                            <Card key={titleWidth} className="flex items-center justify-between gap-4 px-5 py-4">
                                <div>
                                    <Skeleton className={`h-4 ${titleWidth}`} />
                                    <Skeleton soft className="mt-2 h-3 w-32" />
                                </div>
                                <Skeleton className="h-4 w-20" />
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
