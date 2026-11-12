"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { buttonVariantClasses } from "@/components/ui/driver/Button";
import { formatAmounts } from "@/lib/format/money";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import { saleAmountLine } from "@/lib/driver/sales/collected";
import { CLIENT_PAID_LABEL } from "@/lib/driver/sales/saleLabels";
import type { Sale } from "@/types/driver/cash-up";
import { AmountLines } from "./SaleDetailGroups";
import { SaleDetailsCells } from "./SaleDetailsCells";
import { SaleStatusBadge } from "./SaleStatusBadge";

const TH = "h-10 px-5 font-medium whitespace-nowrap";
const TD = "h-14 px-5";
/** The last column takes only the width of its buttons, so they keep their size at the right edge. */
const ACTIONS = "w-px whitespace-nowrap";
const SMALL_BUTTON = "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap";

type SaleRowProps = {
    sale: Sale;
    /** Delivered sales get a button that opens how the sale worked out. */
    expandable: boolean;
    /** Only for the open cash-up: Delete on "to deliver" sales. */
    onDelete?: (sale: Sale) => void;
    /** Only for the open cash-up: delivered sales are locked and get "Request deletion". */
    onRequestDeletion?: (sale: Sale) => void;
};

function SaleRow({ sale, expandable, onDelete, onRequestDeletion }: SaleRowProps) {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const { label, amounts } = saleAmountLine(sale);
    const collected = label === CLIENT_PAID_LABEL;
    const hasDetails = expandable && sale.status === "DELIVERED";
    const lockedInOpenCashUp = sale.status === "DELIVERED" && onRequestDeletion !== undefined;

    return (
        <tbody className="border-b border-subtle last:border-b-0">
            <tr>
                <td className={`${TD} font-heading font-semibold`}>#{sale.number}</td>
                <td className={`${TD} font-mono text-[13px]`}>
                    <span className="whitespace-nowrap">{sale.clientPhone}</span>
                    {sale.status === "DELETED" && sale.cancelReason && (
                        <span className="block font-sans text-xs text-muted">Deleted: {sale.cancelReason}</span>
                    )}
                </td>
                <td className={`${TD} font-mono text-[13px] whitespace-nowrap text-muted`}>{sale.time}</td>
                <td className={`${TD} whitespace-nowrap`}>
                    <span className="inline-flex items-center gap-1.5">
                        {lockedInOpenCashUp && (
                            <span role="img" aria-label="Locked" className="text-muted">
                                <Icon name="lock" size={14} />
                            </span>
                        )}
                        <SaleStatusBadge status={sale.status} />
                    </span>
                </td>
                {/* USD on one line and LBP on the next, on every row; a waiting or deleted row adds its label below. */}
                <td className={`${TD} py-2 font-mono text-[13px] font-semibold ${collected ? "" : "text-muted"}`}>
                    <AmountLines amounts={amounts} />
                    {!collected && <span className="block font-sans text-xs font-normal">{label.toLowerCase()}</span>}
                </td>
                <td className={`${TD} ${ACTIONS}`}>
                    <div className="flex items-center justify-end gap-2">
                        {sale.status === "TO_DELIVER" && (
                            <>
                                <div className="w-44">
                                    <ButtonLink href={withOrigin(routes.driver.completeDelivery(sale.id), "sales")} variant="secondary">
                                        Complete delivery
                                    </ButtonLink>
                                </div>
                                <div className="w-20">
                                    <ButtonLink href={withOrigin(routes.driver.editSale(sale.id), "sales")} variant="secondary">
                                        Edit
                                    </ButtonLink>
                                </div>
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(sale)}
                                        aria-label={`Delete sale #${sale.number} ${formatAmounts(amounts)}`}
                                        className={`${SMALL_BUTTON} ${buttonVariantClasses("dangerOutline")}`}
                                    >
                                        <Icon name="trash" size={16} />
                                        Delete
                                    </button>
                                )}
                            </>
                        )}
                        {lockedInOpenCashUp &&
                            (sale.deletionAwaiting ? (
                                <Badge tone="warning">Deletion requested</Badge>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onRequestDeletion(sale)}
                                    className={`${SMALL_BUTTON} ${buttonVariantClasses("secondary")}`}
                                >
                                    Request deletion
                                </button>
                            ))}
                        {hasDetails && (
                            <button
                                type="button"
                                aria-expanded={open}
                                aria-controls={detailsId}
                                aria-label={`${open ? "Hide" : "Show"} details of sale ${sale.number}`}
                                onClick={() => setOpen((value) => !value)}
                                className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                            >
                                <Icon
                                    name="chevronDown"
                                    size={18}
                                    className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                                />
                            </button>
                        )}
                    </div>
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
    /** Only for the open cash-up: Delete on "to deliver" sales. */
    onDelete?: (sale: Sale) => void;
    /** Only for the open cash-up: "Request deletion" on delivered sales. */
    onRequestDeletion?: (sale: Sale) => void;
};

export function SalesTable({ sales, expandable = false, onDelete, onRequestDeletion }: SalesTableProps) {
    return (
        <Card as="section" aria-label="Sales" className="overflow-hidden">
            <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left text-xs tracking-wider text-muted uppercase">
                    <tr>
                        <th className={TH}>Sale</th>
                        <th className={TH}>Client</th>
                        <th className={TH}>Time</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>{CLIENT_PAID_LABEL}</th>
                        <th className={`${TH} ${ACTIONS}`}>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                {sales.map((sale) => (
                    <SaleRow
                        key={sale.id}
                        sale={sale}
                        expandable={expandable}
                        onDelete={onDelete}
                        onRequestDeletion={onRequestDeletion}
                    />
                ))}
            </table>
        </Card>
    );
}
