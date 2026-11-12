import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { isZeroAmounts } from "@/lib/money/amounts";
import { DELIVERED_TOTAL_LABEL } from "@/lib/driver/sales/saleLabels";

type SalesTotalsProps = { delivered: Amounts; waiting: Amounts };

const LABEL = "text-xs font-medium tracking-wider uppercase";

/**
 * What delivered sales brought in (client paid minus change, every method), and what waiting sales still ask for.
 * Phone: one card. Desktop: two.
 */
export function SalesTotals({ delivered, waiting }: SalesTotalsProps) {
	const deliveredZero = isZeroAmounts(delivered);
	const waitingZero = isZeroAmounts(waiting);

	return (
		<>
			<Card as="section" aria-label="Totals" className="mt-1 space-y-2 px-4 py-3 md:hidden">
				<div className="flex items-center justify-between gap-2">
					<span className={`${LABEL} text-muted`}>{DELIVERED_TOTAL_LABEL}</span>
					<span className={`font-mono text-sm font-semibold ${deliveredZero ? "text-muted" : "text-success"}`}>
						{formatAmounts(delivered)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2 border-t border-subtle pt-2">
					<span className={`${LABEL} ${waitingZero ? "text-muted" : "text-warning"}`}>Waiting</span>
					<span className={`font-mono text-sm font-semibold ${waitingZero ? "text-muted" : "text-warning"}`}>
						{formatAmounts(waiting)}
					</span>
				</div>
			</Card>

			<div className="hidden grid-cols-2 gap-4 md:grid">
				<Card className="px-5 py-3.5">
					<p className={`${LABEL} text-muted`}>{DELIVERED_TOTAL_LABEL}</p>
					<p className="mt-1 font-mono text-xl font-semibold text-success">{formatAmounts(delivered)}</p>
				</Card>
				<Card className="px-5 py-3.5">
					<p className={`${LABEL} text-muted`}>Waiting</p>
					<p className="mt-1 font-mono text-xl font-semibold text-warning">{formatAmounts(waiting)}</p>
				</Card>
			</div>
		</>
	);
}
