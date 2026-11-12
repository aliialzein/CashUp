import type { ReactNode } from "react";

type CollapseProps = {
    open: boolean;
    /** Never fold from tablet width up: there the content is always shown, whatever `open` says. */
    alwaysOpenFromMd?: boolean;
    children: ReactNode;
};

const OPEN = "grid-rows-[1fr] opacity-100 visible";
const CLOSED = "grid-rows-[0fr] opacity-0 invisible";
const OPEN_FROM_MD = "md:grid-rows-[1fr] md:opacity-100 md:visible";

/**
 * Slowly folds its content away and back: the height shrinks while the content fades.
 * Once folded, the content is invisible, so the keyboard and screen readers skip it.
 * Put any space above it inside the content, not around it, so a closed one takes no room.
 */
export function Collapse({ open, alwaysOpenFromMd = false, children }: CollapseProps) {
    return (
        <div
            className={`grid transition-[grid-template-rows,opacity,visibility] duration-500 ease-in-out motion-reduce:transition-none ${
                open ? OPEN : CLOSED
            } ${alwaysOpenFromMd ? OPEN_FROM_MD : ""}`}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}
