import "server-only";
import type { Amounts } from "@/lib/format/money";
import { currentActor } from "@/server/context";
import { openCashUpSchema } from "@/validation";

/** Opens a real cash-up. Validation first (cheap), then the Actor, then the service. */
export async function startRealCashUp(float: Amounts): Promise<void> {
    const input = openCashUpSchema.parse({ floatUsd: float.usd, floatLbp: float.lbp });
    const { deps, actor } = await currentActor();
    await deps.lifecycle.open(actor, input);
}
