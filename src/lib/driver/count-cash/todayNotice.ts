import { routes } from "@/lib/routes";

/** What the count page just finished, told to Today through the URL (?done=...). */
export type CountDone = "count-saved" | "submitted";

const NOTICE_TEXT: Record<CountDone, string> = {
    "count-saved": "Count saved. You can finish it later.",
    submitted: "Cash-up submitted. The owner will review it.",
};

/** Where the count page sends the driver when it is done. */
export function todayAfter(done: CountDone): string {
    return `${routes.driver.today}?done=${done}`;
}

/** The green line Today shows for `?done=...`, or null for anything else (the URL can be typed by anyone). */
export function todayNotice(done: string | string[] | undefined): string | null {
    if (typeof done !== "string" || !Object.hasOwn(NOTICE_TEXT, done)) return null;
    return NOTICE_TEXT[done as CountDone];
}
