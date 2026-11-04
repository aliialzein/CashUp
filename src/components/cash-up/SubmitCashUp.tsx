import type { ReactNode } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitCashUp } from "@/lib/cash-up/actions";

type SubmitCashUpProps = {
    /** Sales that are not deleted. A cash-up with none cannot be submitted: cancel it instead. */
    salesCount: number;
    waitingCount: number;
    /** True once the driver has saved a count. */
    isCounted: boolean;
    /** True when the owner sent the cash-up back: the button then says "Submit again". */
    isReturned?: boolean;
};

function BlockedSubmit({ children }: { children: ReactNode }) {
    return (
        <Button variant="warning" disabled>
            <span className="inline-flex items-center gap-2">
                <Icon name="lock" size={16} />
                {children}
            </span>
        </Button>
    );
}

/** Blocked until there is a sale, every sale is delivered, and the cash is counted. It says which. */
function SubmitControl({ salesCount, waitingCount, isCounted, isReturned = false }: SubmitCashUpProps) {
    const verb = isReturned ? "Submit again" : "Submit";

    if (salesCount === 0) return <BlockedSubmit>{verb} · add a sale first</BlockedSubmit>;

    if (waitingCount > 0) {
        return (
            <BlockedSubmit>
                {verb} · {waitingCount} {waitingCount === 1 ? "sale" : "sales"} still to deliver
            </BlockedSubmit>
        );
    }

    if (!isCounted) return <BlockedSubmit>{verb} · count your cash first</BlockedSubmit>;

    return (
        <form action={submitCashUp}>
            <Button type="submit">{isReturned ? "Submit again" : "Submit cash-up"}</Button>
        </form>
    );
}

/** On phone the Submit button is stuck above the tab bar, so it is always in reach. */
export function SubmitCashUp(props: SubmitCashUpProps) {
    return (
        <BottomBar aboveTabs>
            <SubmitControl {...props} />
        </BottomBar>
    );
}
