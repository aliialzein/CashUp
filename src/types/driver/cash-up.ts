import type { Amounts } from "@/lib/format/money";
import type { CashOutReason } from "@/lib/driver/cash-out/reasons";
import type { CashCount } from "@/lib/driver/count-cash/denominations";
import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";

export type CashUpStatus = "OPEN" | "SUBMITTED" | "RETURNED" | "APPROVED";

export type SaleStatus = "TO_DELIVER" | "DELIVERED" | "DELETED";

export type Sale = {
    id: string;
    number: number;
    /** Display text: the client number, or "Shop sale" when there is none. */
    clientPhone: string;
    /** The client number exactly as saved, or null. Edit sale fills its field from this, never from the display text. */
    clientNumber: string | null;
    /** Time only (HH:mm). The page groups sales by date when a cash-up spans several days. */
    time: string;
    status: SaleStatus;
    /** What the sale asks the client to pay. */
    amount: Amounts;
    /** Delivery fee typed in Add sale. Complete delivery pre-fills it, and the driver can edit it. */
    deliveryFee?: Amounts;
    /** The day of the sale as display text, e.g. "27 Oct". Shown in the sale summary. */
    date?: string;
    /** Change the driver gave back, positive. Shown in the sale summary. */
    changeGiven?: Amounts;
    /** How the client paid. */
    method?: PaymentMethod;
    /** Extra money the client gave, and money taken off. Positive amounts. */
    tip?: Amounts;
    discount?: Amounts;
    /** What was really collected. The server calculates it, so it can differ from order + fee. */
    totalCollected?: Amounts;
    /** Free text on the sale. */
    note?: string;
    /** Flags the owner sees at review. */
    isEdited?: boolean;
    amountDiffers?: boolean;
    /** A delivered sale with an open deletion request: the owner still has to approve or refuse it. */
    deletionAwaiting?: boolean;
    /** Why a deleted sale was deleted. Only set on a deleted sale that has a reason. */
    cancelReason?: string;
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

export type CashOut = {
    id: string;
    /** The category, used by the filter chips. */
    reason: CashOutReason;
    /** The driver's own words after the category, e.g. "Car wash" in "Other: Car wash". See reasonText.ts. */
    detail?: string;
    /** Time only (HH:mm). */
    time: string;
    /** Optional free text the driver typed. Stored in the cash-out's note column. */
    note?: string;
    /** Positive amounts in USD and LBP, like the cash-up lines. Shown as money leaving the drawer. */
    amount: Amounts;
    /** Cancelled on the backend (soft-deleted). Kept so a screen can show it later; hidden for now. */
    isDeleted: boolean;
    /** Why it was cancelled. Only set on a deleted cash-out that has a reason. */
    cancelReason?: string;
};

export type CashUp = {
    id: string;
    number: number;
    status: CashUpStatus;
    /** Why the owner returned it. `null` unless the status is RETURNED. */
    returned: ReturnNote | null;
    /** Display text, e.g. "27 Oct, 08:30". */
    startedAt: string;
    /** Today's rate in LBP per 1 USD ("90000.00"), set at Start cash-up. `null` when the cash-up has none. */
    referenceRate: string | null;
    ledger: Ledger;
    /** Count and total of all sales that are not deleted. The server calculates it. */
    salesCount: number;
    salesTotal: Amounts;
    /** What the driver counted in the drawer. `null` until the first count is saved. */
    counted: Amounts | null;
    /** The saved count note by note, so Count cash can show it again. `null` until the first count is saved. */
    savedCounts: CashCount | null;
    /** Totals of delivered sales and of sales still waiting. The server calculates them. */
    deliveredTotal: Amounts;
    waitingTotal: Amounts;
    sales: Sale[];
    cashOuts: CashOut[];
};

/** One row of the History list. */
export type CashUpSummary = {
    id: string;
    number: number;
    status: CashUpStatus;
    /** Display text, e.g. "28 Oct". */
    date: string;
    /** The day it started, e.g. "2026-10-28". Groups the phone list by month. */
    isoDate: string;
    /** Why the owner returned it. Only set while the status is RETURNED. */
    returnReason?: string;
    salesCount: number;
    /** Counted minus expected, frozen when the cash-up was submitted. `null` while open or returned. */
    gap: Amounts | null;
};

/** When the owner approved a cash-up. The screens always say "Owner", never a name. */
export type CashUpReview = {
    /** Display text, e.g. "26 Oct, 09:10". */
    at: string;
};

/** A cash-up that was submitted: locked, with its frozen count and gap. */
export type CashUpDetail = {
    id: string;
    number: number;
    /** SUBMITTED or APPROVED. Open and returned cash-ups continue on Today. */
    status: Extract<CashUpStatus, "SUBMITTED" | "APPROVED">;
    submittedAt: string;
    /** The drawer totals from the backend. Never computed on the frontend. */
    ledger: Ledger;
    /** What the driver counted when submitting. */
    counted: Amounts;
    /** Counted minus expected, frozen at submit. */
    gap: Amounts;
    /** All sales of this cash-up. */
    sales: Sale[];
    /** All cash-outs of this cash-up. */
    cashOuts: CashOut[];
    /** Total of the delivered sales. The server calculates it. */
    deliveredTotal: Amounts;
    /** `null` until the owner approves. */
    review: CashUpReview | null;
};

/** The owner's reason for sending a cash-up back. */
export type ReturnNote = {
    by: string;
    text: string;
};

/** The opening float the server suggests, taken from the last cash-up the driver counted. */
export type FloatSuggestion = {
    /** Number of the cash-up it comes from, e.g. 42. */
    fromNumber: number;
    float: Amounts;
};
