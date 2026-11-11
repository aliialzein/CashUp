import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { DeliverySummary } from "@/lib/driver/delivery/summarizeDelivery";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { isZeroAmounts } from "@/lib/money/amounts";

type DeliverySummaryPanelProps = {
    order: Amounts;
    fee: Amounts;
    /** Shown only when not zero. */
    tip?: Amounts;
    /** Shown only when not zero. */
    discount?: Amounts;
    cash: Amounts;
    wallet: Amounts;
    walletLabel: string;
    summary: DeliverySummary;
};

type Tone = Extract<BadgeTone, "success" | "warning" | "info">;

const TONES: Record<Tone, { box: string; text: string; badge: string }> = {
    success: { box: "border-success-line bg-success-bg", text: "text-success", badge: "Covered" },
    warning: { box: "border-warning-line bg-warning-bg", text: "text-warning", badge: "Gap" },
    info: { box: "border-info-line bg-info-bg", text: "text-info", badge: "Extra" },
};

/** The one big line the driver looks at: what is missing, what is extra, or that all is covered. */
function getHeadline(summary: DeliverySummary): { label: string; amounts: Amounts; tone: Tone } {
    if (!isZeroAmounts(summary.remaining)) {
        return { label: "Still to collect", amounts: summary.remaining, tone: "warning" };
    }
    if (!isZeroAmounts(summary.extra)) {
        return { label: "Extra collected", amounts: summary.extra, tone: "info" };
    }
    return { label: "Fully covered", amounts: summary.paid, tone: "success" };
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted">{label}</span>
            <span className={`font-mono font-medium tabular-nums ${className}`}>{value}</span>
        </div>
    );
}

export function DeliverySummaryPanel({ order, fee, tip, discount, cash, wallet, walletLabel, summary }: DeliverySummaryPanelProps) {
    const { label, amounts, tone } = getHeadline(summary);
    // One currency is short while the other has extra: show the extra too.
    const mixed = !isZeroAmounts(summary.remaining) && !isZeroAmounts(summary.extra);

    return (
        <section aria-live="polite" className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className={`border-b px-5 py-4 ${TONES[tone].box}`}>
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium tracking-wider text-muted uppercase">{label}</p>
                    <Badge tone={tone}>
                        <span className="inline-flex items-center gap-1">
                            {tone === "success" && <Icon name="check" size={12} />}
                            {TONES[tone].badge}
                        </span>
                    </Badge>
                </div>
                <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${TONES[tone].text}`}>
                    {formatAmounts(amounts)}
                </p>
                {mixed && <p className="mt-1 text-xs text-info">Extra in the other currency: {formatAmounts(summary.extra)}</p>}
            </div>

            <div className="space-y-2.5 px-5 py-4">
                <Row label="Order" value={formatAmounts(order)} />
                <Row label="Delivery fee" value={formatAmounts(fee)} />
                {tip && !isZeroAmounts(tip) && <Row label="Tip" value={formatAmounts(tip)} />}
                {discount && !isZeroAmounts(discount) && <Row label="Discount" value={formatAmounts(discount)} />}
                <div className="space-y-2.5 border-t border-line pt-2.5">
                    <Row label="Cash" value={formatAmounts(cash)} className="text-success" />
                    <Row label={`Through ${walletLabel}`} value={formatAmounts(wallet)} />
                </div>
            </div>
        </section>
    );
}