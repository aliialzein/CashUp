/** Only used to read relative addresses ("/today?done=x"); never part of the result. */
const ANY_ORIGIN = "http://localhost";

/**
 * The same address as a path, without one search parameter; every other parameter and the #hash stay.
 * "/today?done=submitted" -> "/today", "https://site/today?done=x&from=sales#top" -> "/today?from=sales#top".
 */
export function withoutSearchParam(href: string, name: string): string {
    const url = new URL(href, ANY_ORIGIN);
    url.searchParams.delete(name);
    return `${url.pathname}${url.search}${url.hash}`;
}
