import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import type { Amounts } from "@/lib/format/money";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import { CountStatus } from "./CountStatus";

type CashUpActionsProps = {
    /** What the driver counted, or `null` if he has not counted yet. */
    counted: Amounts | null;
    /** What the drawer should hold, calculated by the server. */
    expected: Amounts;
};

/** The three things a driver does most: add a sale, take cash out, count the drawer. */
export function CashUpActions({ counted, expected }: CashUpActionsProps) {
    return (
        <div className="space-y-3">
            <ButtonLink href={withOrigin(routes.driver.addSale, "today")} className="gap-2">
                <Icon name="plus" size={18} />
                Add sale
            </ButtonLink>
            <div className="grid grid-cols-2 gap-3">
                <ButtonLink href={routes.driver.cashOuts} variant="secondary">
                    Cash-out
                </ButtonLink>
                <ButtonLink href={routes.driver.countCash} variant="secondary">
                    {counted === null ? "Count cash" : "Recount"}
                </ButtonLink>
            </div>
            <CountStatus counted={counted} expected={expected} />
        </div>
    );
}

