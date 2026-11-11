import type { Sale } from "@/types/driver/cash-up";

/** What every Complete delivery form needs. The page does not care which form it gets. */
export type DeliveryFormProps = {
    sale: Sale;
    /** Drivers must enter a fee. Cashiers may leave it empty. */
    feeRequired: boolean;
    /** Where Cancel and Confirm go: the page the driver came from. */
    returnHref: string;
    /** The Edit sale page, for a wrong amount or discount (they cannot be changed at delivery). */
    editHref: string;
};
