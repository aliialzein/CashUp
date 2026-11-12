import type { ComponentType } from "react";
import { DELIVERY_PAYMENT_MODE, type DeliveryPaymentMode } from "@/lib/driver/delivery/paymentMode";
import type { DeliveryFormProps } from "./deliveryFormProps";
import { SingleMethodDeliveryForm } from "./SingleMethodDeliveryForm";
import { SplitDeliveryForm } from "./SplitDeliveryForm";

const FORMS: Record<DeliveryPaymentMode, ComponentType<DeliveryFormProps>> = {
    single: SingleMethodDeliveryForm,
    split: SplitDeliveryForm,
};

/** Shows the Complete delivery form the app is set to use (see `paymentMode.ts`). */
export function CompleteDeliveryForm(props: DeliveryFormProps) {
    const Form = FORMS[DELIVERY_PAYMENT_MODE];
    return <Form {...props} />;
}
