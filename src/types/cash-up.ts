import type { Amounts } from "@/lib/format/money";

export type CashUpStatus = "OPEN" | "SUBMITTED" | "RETURNED" | "APPROVED";

export type SaleStatus = "TO_DELIVER" | "DELIVERED" | "DELETED";

export type Sale = {
    id: string;
    number: number;
    clientPhone: string;
    /** Time only (HH:mm). The page groups sales by date when a cash-up spans several days. */
    time: string;
    status: SaleStatus;
    /** What the sale asks the client to pay. */
    amount: Amounts;
    /** Delivery fee typed in Add sale. Complete delivery pre-fills it, and the driver can edit it. */
    deliveryFee?: Amounts;
};

/**
 * Money lines of the drawer. Expected cash counts DELIVERED sales only,
 * because the driver only holds the money after delivery.
 */
export type Ledger = {
    float: Amounts;
    received: Amounts;
    changeGiven: Amounts;
    cashOuts: Amounts;
    expected: Amounts;
};

export type CashUp = {
    id: string;
    number: number;
    status: CashUpStatus;
    /** Display text, e.g. "27 Oct, 08:30". */
    startedAt: string;
    ledger: Ledger;
    /** Count and total of all sales that are not deleted. The server calculates it. */
    salesCount: number;
    salesTotal: Amounts;
    /** Totals of delivered sales and of sales still waiting. The server calculates them. */
    deliveredTotal: Amounts;
    waitingTotal: Amounts;
    sales: Sale[];
};
