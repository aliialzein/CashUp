import { Suspense } from "react";
import { UrlSuccessNotice } from "@/components/ui/UrlSuccessNotice";
import { accountNotice } from "@/lib/account/accountNotice";

type AccountNoticeProps = {
    /** The Account page's search params, still a promise: `?done=password-changed` after Change password. */
    searchParams: Promise<{ done?: string | string[] }>;
    className?: string;
};

/** Reads `done` and shows the matching green line, or nothing. When the line hides, `done` leaves the address. */
async function AccountNoticeLine({ searchParams, className }: AccountNoticeProps) {
    const { done } = await searchParams;
    const notice = accountNotice(done);
    return (
        notice && (
            <UrlSuccessNotice param="done" className={className}>
                {notice}
            </UrlSuccessNotice>
        )
    );
}

/**
 * The green line after an account change. URL data is read only inside this <Suspense>, so the rest of the Account
 * page does not wait for it (same as TodayNotice). Fallback: nothing.
 */
export function AccountNotice(props: AccountNoticeProps) {
    return (
        <Suspense fallback={null}>
            <AccountNoticeLine {...props} />
        </Suspense>
    );
}
