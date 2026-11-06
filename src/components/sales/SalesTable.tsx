"use client";

import { useId, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts } from "@/lib/format/money";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import { saleAmountLine } from "@/lib/sales/collected";
import type { Sale } from "@/types/cash-up";
import { SaleDetailsCells } from "./SaleDetailsCells";
import { SaleStatusBadge } from "./SaleStatusBadge";

const TH = "h-10 px-5 font-medium";
const TD = "h-14 px-5";

type SaleRowProps = {
    sale: Sale;
    /** Delivered sales get a button that opens how the sale worked out. */
    expandable: boolean;
};

function SaleRow({ sale, expandable }: SaleRowProps) {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const { label, amounts } = saleAmountLine(sale);
    const collected = label === "Collected";
    const hasDetails = expandable && sale.status === "DELIVERED";

    return (
        <tbody className="border-b border-subtle last:border-b-0">
            <tr>
                <td className={`${TD} font-heading font-semibold`}>#{sale.number}</td>
                <td className={`${TD} font-mono text-[13px]`}>{sale.clientPhone}</td>
                <td className={`${TD} font-mono text-[13px] text-muted`}>{sale.time}</td>
                <td className={TD}>
                    <SaleStatusBadge status={sale.status} />
                </td>
                <td className={`${TD} font-mono text-[13px] font-semibold ${collected ? "" : "text-muted"}`}>
                    {formatAmounts(amounts)}
                    {!collected && <span className="ml-2 font-sans text-xs font-normal">{label.toLowerCase()}</span>}
                </td>
                <td className={TD}>
                    {sale.status === "TO_DELIVER" && (
                        <div className="ml-auto w-44">
                            <ButtonLink href={withOrigin(routes.driver.completeDelivery(sale.id), "sales")} variant="secondary">
                                Complete delivery
                            </ButtonLink>
                        </div>
                    )}
                    {hasDetails && (
                        <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={detailsId}
                            aria-label={`${open ? "Hide" : "Show"} details of sale ${sale.number}`}
                            onClick={() => setOpen((value) => !value)}
                            className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                        >
                            <Icon
                                name="chevronDown"
                                size={18}
                                className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                            />
                        </button>
                    )}
                </td>
            </tr>
            {hasDetails && (
                <tr>
                    <td colSpan={6} className="p-0">
                        <Collapse open={open}>
                            <div className="border-t border-subtle bg-canvas px-5 pt-3 pb-4">
                                <SaleDetailsCells sale={sale} id={detailsId} />
                            </div>
                        </Collapse>
                    </td>
                </tr>
            )}
        </tbody>
    );
}

type SalesTableProps = {
    sales: Sale[];
    /** Delivered sales get a details button. */
    expandable?: boolean;
};

export function SalesTable({ sales, expandable = false }: SalesTableProps) {
    return (
        <Card as="section" aria-label="Sales" className="overflow-hidden">
            <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wider text-muted uppercase">
                    <tr>
                        <th className={TH}>Sale</th>
                        <th className={TH}>Client</th>
                        <th className={TH}>Time</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Collected</th>
                        <th className={TH}>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                {sales.map((sale) => (
                    <SaleRow key={sale.id} sale={sale} expandable={expandable} />
                ))}
            </table>
        </Card>
    );
}
