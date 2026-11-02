import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Blocked while sales are still waiting for delivery, and it says why. */
export function SubmitCashUp({ waitingCount }: { waitingCount: number }) {
    if (waitingCount > 0) {
        return (
            <Button variant="warning" disabled>
                <span className="inline-flex items-center gap-2">
                    <Icon name="lock" size={16} />
                    Submit · {waitingCount} {waitingCount === 1 ? "sale" : "sales"} still to deliver
                </span>
            </Button>
        );
    }

    return <Button>Submit cash-up</Button>;
}
