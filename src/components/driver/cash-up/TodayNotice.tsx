import { Suspense } from "react";
import { UrlSuccessNotice } from "@/components/ui/UrlSuccessNotice";
import { todayNotice } from "@/lib/driver/count-cash/todayNotice";

type TodayNoticeProps = {
    /** Today's search params, still a promise: `?done=count-saved` or `?done=submitted` after the count page. */
    searchParams: Promise<{ done?: string | string[] }>;
    className?: string;
};

/** Reads `done` and shows the matching green line, or nothing. When the line hides, `done` leaves the address. */
async function TodayNoticeLine({ searchParams, className }: TodayNoticeProps) {
    const { done } = await searchParams;
    const notice = todayNotice(done);
    return (
        notice && (
            <UrlSuccessNotice param="done" className={className}>
                {notice}
            </UrlSuccessNotice>
        )
    );
}

/**
 * The green line after the count page. URL data is read only inside this <Suspense>, so the rest of Today
 * does not wait for it and navigations to Today stay instant (Next.js "instant-shell-url-data"). Fallback: nothing.
 */
export function TodayNotice(props: TodayNoticeProps) {
    return (
        <Suspense fallback={null}>
            <TodayNoticeLine {...props} />
        </Suspense>
    );
}
