import type { Amounts } from "@/lib/format/money";
import { blankAmountsToZero } from "@/lib/money/blankAmountsToZero";

/** A blank currency means the drawer started with none of it, so it becomes "0". */
export function openingFloat(float: Amounts): Amounts {
    return blankAmountsToZero(float);
}
