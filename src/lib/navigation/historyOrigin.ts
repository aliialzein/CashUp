import { originFromPath, resolveOrigin, type Origin } from "./origin";

/**
 * The page a submitted cash-up was opened from, read from `?from=`.
 * A missing or unknown value means it was opened from History. Pass the result to `withOrigin` on every link
 * that leaves the cash-up page, so the ← of the next page can come back with the same origin.
 */
export function historyOrigin(from: string | string[] | undefined): Origin {
    return originFromPath(resolveOrigin(from, "history").href) ?? "history";
}
