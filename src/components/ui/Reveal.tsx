import type { ReactNode } from "react";

type RevealProps = {
    open: boolean;
    children: ReactNode;
};

/**
 * Shows or hides its children with a smooth height and fade transition.
 * While closed it is inert: nothing inside can be focused or read by a screen reader.
 */
export function Reveal({ open, children }: RevealProps) {
    return (
        <div
            aria-hidden={!open}
            inert={!open}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
        >
            {/* The side padding keeps the focus ring of an input inside from being clipped. */}
            <div className="-mx-1 overflow-hidden px-1">{children}</div>
        </div>
    );
}
