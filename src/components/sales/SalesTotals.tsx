import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";

type SalesTotalsProps = { delivered: Amounts; waiting: Amounts };

/** Money from delivered sales (already in the drawer) and from sales still waiting. */
export function SalesTotals({ delivered, waiting }: SalesTotalsProps) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Card className="px-5 py-3.5">
				<p className="text-xs font-medium tracking-wider text-muted uppercase">Delivered</p>
				<p className="mt-1 font-mono text-xl font-semibold text-success">{formatAmounts(delivered)}</p>
			</Card>
			<Card className="px-5 py-3.5">
				<p className="text-xs font-medium tracking-wider text-muted uppercase">Waiting</p>
				<p className="mt-1 font-mono text-xl font-semibold text-warning">{formatAmounts(waiting)}</p>
			</Card>
		</div>
	);
}
