import { LastCashUpLink } from "@/components/history/LastCashUpLink";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import type { CashUpSummary } from "@/types/cash-up";

/** Today when the driver has no open cash-up: start one, or look at the last one. */
export function NoOpenCashUp({ last }: { last: CashUpSummary | null }) {
    return (
        <div className="mx-auto mt-10 flex w-full max-w-160 flex-col items-center gap-5">
            <EmptyState
                icon="sheet"
                title="No open cash-up"
                text="Start one to record today's sales and cash-outs."
                className="w-full"
            >
                <div className="w-48">
                    <ButtonLink href={routes.driver.startCashUp} className="gap-2">
                        <Icon name="plus" size={16} />
                        Start cash-up
                    </ButtonLink>
                </div>
            </EmptyState>
            {last && <LastCashUpLink item={last} />}
        </div>
    );
}
