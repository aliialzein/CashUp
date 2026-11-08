import "server-only";
import type { HttpDependencies } from "@/http";
import type { Actor } from "@/services/actor";
import type { CashUpDto } from "@/services/dto";

/** The list is newest first and a driver has at most one open cash-up, so a few rows are enough. */
const OWN_ROWS_TO_SCAN = 5;

/** The driver's open cash-up (a returned one counts as open), or null when there is none. */
export async function findOwnOpenCashUp(
    queries: HttpDependencies["queries"],
    actor: Actor,
): Promise<CashUpDto | null> {
    const rows = await queries.listOwn(actor, { take: OWN_ROWS_TO_SCAN });
    return rows.find((row) => row.status === "OPEN") ?? null;
}
