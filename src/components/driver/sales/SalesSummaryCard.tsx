import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { routes } from "@/lib/routes";

type SalesSummaryCardProps = { count: number; total: Amounts };

/** One-line summary of all sales. The whole card opens the full sales list. */
export function SalesSummaryCard({ count, total }: SalesSummaryCardProps) {
    return (
        <Link href={routes.driver.sales} className="block">
            <Card className="flex items-center justify-between px-5 py-4 hover:bg-canvas">
                <div>
                    <p className="font-heading text-[17px] font-semibold">Sales · {count}</p>
                    <p className="mt-0.5 font-mono text-[13px] text-muted">{formatAmounts(total)}</p>
                </div>
                <Icon name="chevronRight" className="text-muted" />
            </Card>
        </Link>
    );
}
