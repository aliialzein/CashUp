import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type DeliverySectionProps = {
    title: string;
    /** Desktop only. The phone keeps just the title, like the design. */
    hint?: string;
    /** Something at the right of the title, like a shortcut button. */
    action?: ReactNode;
    children: ReactNode;
};

/** A titled group of fields: a card on desktop, a plain labelled block on the phone. */
export function DeliverySection({ title, hint, action, children }: DeliverySectionProps) {
    return (
        <Card
            as="section"
            className="flex flex-col gap-2 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none md:gap-3 md:p-6"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="font-heading text-xs font-medium tracking-wider text-muted uppercase md:text-base md:font-semibold md:tracking-normal md:text-ink md:normal-case">
                        {title}
                    </h2>
                    {hint && <p className="hidden text-[13px] leading-snug text-muted md:block">{hint}</p>}
                </div>
                {action}
            </div>
            {children}
        </Card>
    );
}
