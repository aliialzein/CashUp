import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { formatAmounts } from "@/lib/format/money";
import { routes } from "@/lib/routes";
import type { Sale } from "@/types/cash-up";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { withOrigin } from "@/lib/navigation/origin";

const TH = "h-10 px-5 font-medium";
const TD = "h-14 px-5";

export function SalesTable({ sales }: { sales: Sale[] }) {
	return (
		<Card as="section" aria-label="Sales" className="overflow-hidden">
			<table className="w-full text-sm">
				<thead className="border-b border-line bg-canvas text-left text-xs tracking-wider text-muted uppercase">
					<tr>
						<th className={TH}>Sale</th>
						<th className={TH}>Client</th>
						<th className={TH}>Time</th>
						<th className={TH}>Status</th>
						<th className={TH}>Cash</th>
						<th className={TH}>
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{sales.map((sale) => (
						<tr key={sale.id} className="border-b border-subtle last:border-b-0">
							<td className={`${TD} font-heading font-semibold`}>#{sale.number}</td>
							<td className={`${TD} font-mono text-[13px]`}>{sale.clientPhone}</td>
							<td className={`${TD} font-mono text-[13px] text-muted`}>{sale.time}</td>
							<td className={TD}>
								<SaleStatusBadge status={sale.status} />
							</td>
							<td className={`${TD} font-mono text-[13px] font-semibold`}>{formatAmounts(sale.amount)}</td>
							<td className={TD}>
								{sale.status === "TO_DELIVER" && (
									<div className="ml-auto w-44">
										{/* <ButtonLink href={routes.driver.completeDelivery(sale.id)} variant="secondary"> */}
										<ButtonLink href={withOrigin(routes.driver.completeDelivery(sale.id), "sales")} variant="secondary">
											Complete delivery
										</ButtonLink>
									</div>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	);
}
