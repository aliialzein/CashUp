"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** How long a green line stays fully visible before it fades out by itself. */
export const SUCCESS_NOTICE_DURATION_MS = 3500;

/** The short fade-out after that. Skipped (no animation) when the user prefers reduced motion. */
const FADE_OUT_MS = 300;

type NoticePhase = "shown" | "fading" | "hidden";

type SuccessNoticeProps = {
    children: ReactNode;
    className?: string;
    /** Runs once, right after the notice is gone (e.g. to clean the URL it came from). */
    onHidden?: () => void;
};

/**
 * A green line that confirms something worked, e.g. "Count saved. You can finish it later." Screen readers announce it.
 * It hides itself after SUCCESS_NOTICE_DURATION_MS. To show it again, the parent removes and adds it again, so it starts
 * a fresh full duration. Red error lines are not this component and never hide by themselves.
 */
export function SuccessNotice({ children, className = "", onHidden }: SuccessNoticeProps) {
    const [phase, setPhase] = useState<NoticePhase>("shown");
    // The latest callback, without restarting the timers when the parent re-renders.
    const onHiddenRef = useRef(onHidden);
    useEffect(() => {
        onHiddenRef.current = onHidden;
    });

    useEffect(() => {
        const fadeTimer = window.setTimeout(() => setPhase("fading"), SUCCESS_NOTICE_DURATION_MS);
        const hideTimer = window.setTimeout(() => {
            setPhase("hidden");
            onHiddenRef.current?.();
        }, SUCCESS_NOTICE_DURATION_MS + FADE_OUT_MS);
        // Leaving the page (or the parent removing the notice) must not leave timers running.
        return () => {
            window.clearTimeout(fadeTimer);
            window.clearTimeout(hideTimer);
        };
    }, []);

    if (phase === "hidden") return null;

    return (
        <p
            role="status"
            style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
            className={`rounded-xl border border-success-line bg-success-bg px-4 py-3 text-sm text-success transition-opacity motion-reduce:transition-none ${
                phase === "fading" ? "opacity-0" : "opacity-100"
            } ${className}`}
        >
            {children}
        </p>
    );
}
