"use client";

import type { ReactNode } from "react";
import { withoutSearchParam } from "@/lib/navigation/searchParam";
import { SuccessNotice } from "./SuccessNotice";

type UrlSuccessNoticeProps = {
    /** The search parameter that asked for this notice, e.g. "done" in /today?done=submitted. */
    param: string;
    children: ReactNode;
    className?: string;
};

/**
 * A SuccessNotice that came from the URL. When it hides, the parameter is removed from the address without a reload
 * and without a new history entry (history.replaceState, supported by the Next.js router), so a refresh does not show it again.
 */
export function UrlSuccessNotice({ param, children, className }: UrlSuccessNoticeProps) {
    function removeParam() {
        window.history.replaceState(null, "", withoutSearchParam(window.location.href, param));
    }

    return (
        <SuccessNotice className={className} onHidden={removeParam}>
            {children}
        </SuccessNotice>
    );
}
