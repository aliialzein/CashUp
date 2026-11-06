import { EmptyState } from "@/components/ui/EmptyState";
import type { CashOut } from "@/types/driver/cash-up";
import { CashOutCards } from "./CashOutCards";
import { CashOutsTable, type EmptyText } from "./CashOutsTable";

type CashOutsResultsProps = {
    cashOuts: CashOut[];
    /** What the empty desktop table says. */
    empty: EmptyText;
    /** What the empty phone card says. Defaults to the desktop wording. */
    phoneEmpty?: EmptyText;
};

/** The cash-outs themselves: cards on the phone, a table on desktop. One place decides which, so both lists stay in step. */
export function CashOutsResults({ cashOuts, empty, phoneEmpty = empty }: CashOutsResultsProps) {
    return (
        <>
            <div className="md:hidden">
                {cashOuts.length === 0 ? (
                    <EmptyState icon="minus" title={phoneEmpty.title} text={phoneEmpty.text} />
                ) : (
                    <CashOutCards cashOuts={cashOuts} />
                )}
            </div>
            <div className="hidden md:block">
                <CashOutsTable cashOuts={cashOuts} empty={empty} />
            </div>
        </>
    );
}
