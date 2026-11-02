import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";

/** The three things a driver does most: add a sale, take cash out, count the drawer. */
export function CashUpActions() {
    return (
        <div className="space-y-3">
            <ButtonLink href={routes.driver.addSale} className="gap-2">
                <Icon name="plus" size={18} />
                Add sale
            </ButtonLink>
            <div className="grid grid-cols-2 gap-3">
                <ButtonLink href={routes.driver.cashOuts} variant="secondary">
                    Cash-out
                </ButtonLink>
                <ButtonLink href={routes.driver.countCash} variant="secondary">
                    Count cash
                </ButtonLink>
            </div>
        </div>
    );
}
