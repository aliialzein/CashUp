/** The one place that decides which clock the screens show. The server stores UTC. */
export const BUSINESS_TIME_ZONE = "Asia/Beirut";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "numeric",
    month: "short",
});

/** "2026-12-15T13:30:00.000Z" -> "15:30" (Beirut is UTC+2 in winter, UTC+3 in summer). */
export function formatTime(iso: string): string {
    return timeFormat.format(new Date(iso));
}

/** "2026-12-15T13:30:00.000Z" -> "15 Dec" */
export function formatDay(iso: string): string {
    const parts = dayFormat.formatToParts(new Date(iso));
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    return `${day} ${month}`;
}

/** The Beirut day as "2026-10-28". It groups the History list by month. */
export function formatIsoDay(iso: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: BUSINESS_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(iso));
}
