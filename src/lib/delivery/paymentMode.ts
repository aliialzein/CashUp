/**
 * How a delivery is paid. Both forms are built; this one value picks the one the whole app uses.
 * "single": the client pays with ONE method: Cash, Whish or OMT.
 * "split":  the client may pay part in cash and part by wallet.
 */
export type DeliveryPaymentMode = "single" | "split";

// TODO(team): change this one value to switch phone and desktop together.
export const DELIVERY_PAYMENT_MODE = "single" as DeliveryPaymentMode;
