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

/** What a driver does during the day: add a sale, take cash out. Counting is part of Submit, at the end of the day. */
export function CashUpActions({ counted, expected }: CashUpActionsProps) {
    return (
        <div className="space-y-3">
            <ButtonLink href={withOrigin(routes.driver.addSale, "today")} className="gap-2">
                <Icon name="plus" size={18} />
                Add sale
            </ButtonLink>
            <ButtonLink href={routes.driver.cashOuts} variant="secondary" className="gap-2">
                <Icon name="minus" size={18} className="text-muted" />
                Cash-out
            </ButtonLink>
            <CountStatus counted={counted} expected={expected} />
        </div>
    );
}
