import { routes } from "@/lib/routes";

/** The pages a form can be opened from, so Cancel and Save can go back to the right one. */
const ORIGINS = {
    today: { href: routes.driver.today, label: "Today" },
    sales: { href: routes.driver.sales, label: "Sales" },
    "cash-outs": { href: routes.driver.cashOuts, label: "Cash-outs" },
    history: { href: routes.driver.history, label: "History" },
    account: { href: routes.driver.account, label: "Account" },
} as const;

export type Origin = keyof typeof ORIGINS;

export type OriginLink = { href: string; label: string };

/** `/switch-business` -> `/switch-business?from=today` */
export function withOrigin(href: string, origin: Origin): string {
    return `${href}?from=${origin}`;
}

/** The known page a path belongs to, e.g. `/history/12` belongs to History. `undefined` for any other path. */
export function originFromPath(pathname: string): Origin | undefined {
    const entries = Object.entries(ORIGINS) as [Origin, OriginLink][];
    return entries.find(([, { href }]) => pathname === href || pathname.startsWith(`${href}/`))?.[0];
}

/** The page to go back to. Anything that is not a known origin, or is missing, gives the fallback origin. */
export function resolveOrigin(from: string | string[] | undefined, fallback: Origin): OriginLink {
    const origin = typeof from === "string" && Object.hasOwn(ORIGINS, from) ? (from as Origin) : fallback;
    return ORIGINS[origin];
}
