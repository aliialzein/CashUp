import { GapText } from "@/components/count-cash/GapText";
import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { subtractAmounts } from "@/lib/money/amounts";

type CountStatusProps = {
    /** What the driver counted, or `null` if he has not counted yet. */
    counted: Amounts | null;
    expected: Amounts;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted">{label}</span>
            <span className="font-mono font-semibold">{children}</span>
        </div>
    );
}

/** Shows on Today how far the saved count is from the expected cash. Nothing shows until a count is saved. */
export function CountStatus({ counted, expected }: CountStatusProps) {
    if (counted === null) return null;

    const gap = subtractAmounts(counted, expected);
    return (
        <Card className="space-y-1.5 px-4 py-3 text-sm">
            <Row label="Counted">{formatAmounts(counted)}</Row>
            <Row label="Gap">
                <GapText gap={gap} />
            </Row>
        </Card>
    );
}
