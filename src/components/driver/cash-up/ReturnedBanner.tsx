import { Icon } from "@/components/ui/Icon";
import type { ReturnNote } from "@/types/driver/cash-up";

/** Tells the driver the owner sent the cash-up back, and why. */
export function ReturnedBanner({ by, text }: ReturnNote) {
    return (
        <section
            aria-label="Returned by the owner"
            className="flex items-start gap-3 rounded-xl border border-warning-line bg-warning-bg px-5 py-3.5 text-warning"
        >
            <Icon name="undo" size={20} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5 text-sm leading-snug">
                <span className="font-heading font-semibold">Returned by {by}</span>
                <span>“{text}”</span>
            </div>
        </section>
    );
}
