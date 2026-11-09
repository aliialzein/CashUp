import type { Amounts } from "@/lib/format/money";

function blankToZero(value: string): string {
    return value.trim() === "" ? "0" : value;
}

/**
 * A currency field the driver left blank means "none of it", so it becomes "0".
 * Forms call this before their action; the actions themselves treat blank as unreadable (see toBackendMoney).
 */
export function blankAmountsToZero({ usd, lbp }: Amounts): Amounts {
    return { usd: blankToZero(usd), lbp: blankToZero(lbp) };
}
