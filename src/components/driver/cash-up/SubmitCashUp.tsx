import type { ReactNode } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/driver/Button";
import { Icon } from "@/components/ui/Icon";
import { submitStep } from "@/lib/driver/cash-up/submitStep";
import { routes } from "@/lib/routes";

type SubmitCashUpProps = {
    /** Sales that are not deleted. A cash-up with none cannot be submitted: cancel it instead. */
    salesCount: number;
    waitingCount: number;
    /** True when the owner sent the cash-up back: the button then says "Submit again". */
    isReturned?: boolean;
};

/** Yellow while sales still wait for delivery (something to finish). Grey when the driver just has a step to do. */
function BlockedSubmit({ tone, children }: { tone: "warning" | "neutral"; children: ReactNode }) {
    return (
        <Button
            variant={tone === "warning" ? "warning" : "ghost"}
            className={tone === "neutral" ? "border border-line bg-subtle" : ""}
            disabled
        >
            <span className="inline-flex items-center gap-2">
                <Icon name="lock" size={16} />
                {children}
            </span>
        </Button>
    );
}

/** Blocked until every sale is delivered and there is a sale. Then it opens Count cash, the last step before submitting. */
function SubmitControl({ salesCount, waitingCount, isReturned = false }: SubmitCashUpProps) {
    const verb = isReturned ? "Submit again" : "Submit";
    const step = submitStep(salesCount, waitingCount);

    if (step.kind === "deliver-first") {
        return (
            <BlockedSubmit tone="warning">
                {verb} · {step.waitingCount} {step.waitingCount === 1 ? "sale" : "sales"} still to deliver
            </BlockedSubmit>
        );
    }

    if (step.kind === "add-sale-first") return <BlockedSubmit tone="neutral">{verb} · add a sale first</BlockedSubmit>;

    return <ButtonLink href={routes.driver.countCash}>{isReturned ? "Submit again" : "Submit cash-up"}</ButtonLink>;
}

/** On phone the Submit button is stuck above the tab bar, so it is always in reach. */
export function SubmitCashUp(props: SubmitCashUpProps) {
    return (
        <BottomBar aboveTabs>
            <SubmitControl {...props} />
        </BottomBar>
    );
}
