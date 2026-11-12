type FieldNoticeProps = {
    message: string;
    visible: boolean;
};

/** A small bubble above a field. The parent must be `relative`. It fades in and out. */
export function FieldNotice({ message, visible }: FieldNoticeProps) {
    return (
        <span
            role="status"
            aria-hidden={!visible}
            className={`pointer-events-none absolute right-0 bottom-full z-10 mb-1.5 rounded-lg border border-danger-line bg-danger-bg px-2.5 py-1.5 text-xs font-medium text-danger shadow-sm transition-opacity duration-150 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"
                }`}
        >
            {message}
        </span>
    );
}

/*
    This is for the limit pop message
*/
