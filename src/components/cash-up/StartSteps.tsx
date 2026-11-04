import type { ComponentProps } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/SectionLabel";

type IconName = ComponentProps<typeof Icon>["name"];

const STEPS: { icon: IconName; title: string; text: string }[] = [
    { icon: "drawer", title: "Count your drawer", text: "This is your opening float." },
    { icon: "plus", title: "Record sales and cash-outs", text: "As the day goes." },
    { icon: "done", title: "Count and submit", text: "The owner then approves." },
];

/** Tells a driver what a cash-up day looks like before starting one. */
export function StartSteps() {
    return (
        <Card as="section" aria-label="What happens next" className="space-y-5 p-6">
            <SectionLabel>What happens next</SectionLabel>
            {STEPS.map(({ icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-subtle text-muted">
                        <Icon name={icon} size={20} />
                    </span>
                    <div>
                        <p className="font-heading font-semibold">{title}</p>
                        <p className="text-[13px] text-muted">{text}</p>
                    </div>
                </div>
            ))}
        </Card>
    );
}
