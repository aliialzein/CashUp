import { Suspense } from "react";
import { SuccessNotice } from "@/components/ui/SuccessNotice";
import { todayNotice } from "@/lib/driver/count-cash/todayNotice";

type TodayNoticeProps = {
    /** Today's search params, still a promise: `?done=count-saved` or `?done=submitted` after the count page. */
    searchParams: Promise<{ done?: string | string[] }>;
    className?: string;
};

/** Reads `done` and shows the matching green line, or nothing. */
async function TodayNoticeLine({ searchParams, className }: TodayNoticeProps) {
    const { done } = await searchParams;
    const notice = todayNotice(done);
    return notice && <SuccessNotice className={className}>{notice}</SuccessNotice>;
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
