"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A flag that turns on with `show()` and turns itself off after `durationMs`. `hide()` turns it off right away. */
export function useTransientFlag(durationMs: number) {
    const [active, setActive] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const stopTimer = useCallback(() => clearTimeout(timer.current), []);

    const hide = useCallback(() => {
        stopTimer();
        setActive(false);
    }, [stopTimer]);

    const show = useCallback(() => {
        stopTimer();
        setActive(true);
        timer.current = setTimeout(() => setActive(false), durationMs);
    }, [stopTimer, durationMs]);

    useEffect(() => stopTimer, [stopTimer]);

    return { active, show, hide };
}

/*
    This is for the limit pop message
*/