"use server";

import { revalidatePath } from "next/cache";
import type { Amounts } from "@/lib/format/money";
import { cancelMockCashUp, startMockCashUp } from "@/lib/mock/today";
import { routes } from "@/lib/routes";

/** Deletes the driver's open cash-up. */
export async function cancelCashUp(): Promise<void> {
    // TODO(backend): DELETE the cash-up. The server refuses when it has sales or cash-outs.
    cancelMockCashUp();
    revalidatePath(routes.driver.today);
}

/** Creates a cash-up with the opening float the driver confirmed. */
export async function startCashUp(float: Amounts): Promise<void> {
    // TODO(backend): create the cash-up with `float`. The server returns it.
    void float;
    startMockCashUp();
    revalidatePath(routes.driver.today);
}
