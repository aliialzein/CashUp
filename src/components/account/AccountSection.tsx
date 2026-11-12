import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function AccountSection({ label, children }: { label: string; children: ReactNode }) {
    return (
        <section className="space-y-2">
            <SectionLabel>{label}</SectionLabel>
            <Card className="divide-y divide-subtle overflow-hidden">{children}</Card>
        </section>
    );
}
