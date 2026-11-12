type SkeletonProps = {
    /** Size and shape, e.g. "h-4 w-24" or "h-11 w-full rounded-xl". */
    className?: string;
    /** The lighter fill, for secondary lines and buttons. */
    soft?: boolean;
};

/** A grey placeholder shape that pulses while a page loads. Screen readers skip it. */
export function Skeleton({ className = "", soft = false }: SkeletonProps) {
    // Two corner sizes on one element would fight, so the default corner applies only when className sets none.
    const corner = className.includes("rounded-") ? "" : "rounded-md";
    const fill = soft ? "bg-subtle" : "bg-line";

    return (
        <span
            aria-hidden="true"
            className={`block animate-pulse motion-reduce:animate-none ${corner} ${fill} ${className}`.trim()}
        />
    );
}
