import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";
import type { BackendAmounts } from "@/lib/money/toBackendMoney";

/**
 * Every sale write, in the words of the sale design the team agreed. Screens and actions depend only on this;
 * two implementations exist (mockSaleWrites, realSaleWrites) and saleWrites.ts picks one.
 * No method takes a cash-up id: each implementation finds the driver's open cash-up itself.
 * Money is already in the backend's two-decimal form (toBackendAmounts).
 */

/** What Add sale and Edit sale carry. A new sale is always "to deliver". */
export type SaleDetails = {
    amount: BackendAmounts;
    deliveryFee: BackendAmounts;
    discount: BackendAmounts;
    clientNumber: string;
    note: string | null;
};

/** What Complete delivery sends in one call. Amount and discount are not here: they are not changed at delivery. */
export type DeliveryDetails = {
    /** Pre-filled from the sale; the driver may change it. */
    deliveryFee: BackendAmounts;
    /** Entered only here. */
    tip: BackendAmounts;
    method: PaymentMethod;
    /** What the client handed over (cash) or sent (wallet). */
    collected: BackendAmounts;
    /** What the driver gave back. */
    change: BackendAmounts;
};

export interface SaleWriteGateway {
    /** `saveKey` comes from the form, so a double click or a retry never records the sale twice. */
    addSale(details: SaleDetails, saveKey: string): Promise<ActionResult>;
    /** Only the fields that changed, at least one. Only a "to deliver" sale can be edited. */
    editSale(saleId: string, changes: Partial<SaleDetails>): Promise<ActionResult>;
    /** After this the sale is delivered and locked. */
    completeDelivery(saleId: string, delivery: DeliveryDetails): Promise<ActionResult>;
    /** A "to deliver" sale, deleted directly with the driver's reason. */
    deleteSale(saleId: string, reason: string): Promise<ActionResult>;
    /** A delivered sale: asks the owner to delete it. */
    requestSaleDeletion(saleId: string, reason: string): Promise<ActionResult>;
}
