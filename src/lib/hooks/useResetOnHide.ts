"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `reset` when the page is left, however the driver leaves it.
 * Next.js keeps a page's state alive after you navigate away, so unsaved choices would come back.
 */
export function useResetOnHide(reset: () => void) {
    const latestReset = useRef(reset);

    useEffect(() => {
        latestReset.current = reset;
    });

    useEffect(() => () => latestReset.current(), []);
}
