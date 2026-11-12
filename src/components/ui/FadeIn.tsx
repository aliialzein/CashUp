import type { ReactNode } from "react";

type FadeInProps = {
    children: ReactNode;
    className?: string;
};

/**
 * Fades and slides its content in when it first appears (CSS @starting-style, no JavaScript).
 * To replay it, the parent renders it again with a new key. No animation when the user prefers reduced motion.
 */
export function FadeIn({ children, className = "" }: FadeInProps) {
    return (
        <div
            className={`transition duration-500 ease-out motion-reduce:transition-none starting:translate-y-2 starting:opacity-0 ${className}`}
        >
            {children}
        </div>
    );
}
