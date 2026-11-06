import type { Amounts } from "@/lib/format/money";

function blankToZero(value: string): string {
    return value.trim() === "" ? "0" : value;
}

/** A blank currency means the drawer started with none of it, so it becomes "0". */
export function openingFloat({ usd, lbp }: Amounts): Amounts {
    return { usd: blankToZero(usd), lbp: blankToZero(lbp) };
}
