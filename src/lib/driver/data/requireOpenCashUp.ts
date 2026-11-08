import "server-only";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import type { CashUp } from "@/types/driver/cash-up";
import { driverData } from "./driverData";

/** For pages that only make sense while a cash-up is open. With none, the driver goes to Today, which offers to start one. */
export async function requireOpenCashUp(): Promise<CashUp> {
    // BACKEND: the open cash-up. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const cashUp = await driverData.getOpenCashUp();
    if (cashUp === null) redirect(routes.driver.today);
    return cashUp;
}
