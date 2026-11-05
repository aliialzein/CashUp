import { LastCashUpLink } from "@/components/history/LastCashUpLink";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import type { CashUpSummary } from "@/types/cash-up";
import { LastCashUpCard } from "./LastCashUpCard";

/** Today when the driver has no open cash-up: start one, or look at the last one. */
export function NoOpenCashUp({ last }: { last: CashUpSummary | null }) {
    return (
        <div className="mx-auto flex w-full max-w-160 flex-col gap-5 md:mt-10 md:items-center">
            <h1 className="font-heading text-xl font-bold tracking-tight md:hidden">Today</h1>

            <EmptyState
                icon="sheet"
                title="No open cash-up"
                text={
                    <>
                        <span className="md:hidden">
                            Start a cash-up to record your sales and the cash you hold during your shift.
                        </span>
                        <span className="hidden md:inline">Start one to record today&apos;s sales and cash-outs.</span>
                    </>
                }
                className="w-full"
            >
                <div className="w-full md:w-48">
                    <ButtonLink href={routes.driver.startCashUp} className="gap-2">
                        <Icon name="plus" size={16} />
                        Start cash-up
                    </ButtonLink>
                </div>
            </EmptyState>

            {last && (
                <>
                    <div className="md:hidden">
                        <LastCashUpCard item={last} />
                    </div>
                    <div className="hidden md:block">
                        <LastCashUpLink item={last} />
                    </div>
                </>
            )}
        </div>
    );
}
