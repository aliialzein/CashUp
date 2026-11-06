import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

/** The compact Add sale button for the phone's title bar. */
export function AddSaleLink() {
    return (
        <Link
            href={withOrigin(routes.driver.addSale, "sales")}
            className="flex h-10.5 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-sm font-semibold text-white"
        >
            <Icon name="plus" size={16} />
            Add sale
        </Link>
    );
}
