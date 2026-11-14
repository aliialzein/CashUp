import { routes } from "@/lib/routes";

/** What an account page just finished, told to the Account page through the URL (?done=...). */
export type AccountDone = "password-changed";

const NOTICE_TEXT: Record<AccountDone, string> = {
    "password-changed": "Password changed. Other devices were signed out.",
};

/** Where an account page sends the member when it is done. */
export function accountAfter(done: AccountDone): string {
    return `${routes.driver.account}?done=${done}`;
}

/** The green line the Account page shows for `?done=...`, or null for anything else (the URL can be typed by anyone). */
export function accountNotice(done: string | string[] | undefined): string | null {
    if (typeof done !== "string" || !Object.hasOwn(NOTICE_TEXT, done)) return null;
    return NOTICE_TEXT[done as AccountDone];
}
