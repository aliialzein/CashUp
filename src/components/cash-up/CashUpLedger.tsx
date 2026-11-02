import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format/money";
import { routes } from "@/lib/routes";
import type { Ledger } from "@/types/cash-up";

const ROW = "grid grid-cols-[6.5rem_1fr_1.3fr] items-center gap-2 px-5";
const NUM = "text-right font-mono text-sm tabular-nums";

type LineProps = {
    label: string;
    usd: string;
    lbp: string;
    /** "in" = money coming in (green), "out" = money going out (red). No tone = neutral. */
    tone?: "in" | "out";
};

function Line({ label, usd, lbp, tone }: LineProps) {
    const color = tone === "in" ? "text-success" : tone === "out" ? "text-danger" : "";
    const signed = tone !== undefined;
    return (
        <>
            <span>{label}</span>
            <span className={`${NUM} ${color}`}>{formatNumber(usd, "USD", { signed })}</span>
            <span className={`${NUM} ${color}`}>{formatNumber(lbp, "LBP", { signed })}</span>
        </>
    );
}

/** Where the cash in the drawer comes from. One column per currency, never mixed. */
export function CashUpLedger({ ledger }: { ledger: Ledger }) {
    return (
        <Card as="section" aria-label="Cash in your drawer" className="overflow-hidden">
            <div className={`${ROW} min-h-10 border-b border-line text-xs font-medium tracking-wider text-muted uppercase`}>
                <span />
                <span className="text-right">USD</span>
                <span className="text-right">LBP</span>
            </div>

            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Float" usd={ledger.float.usd} lbp={ledger.float.lbp} />
            </div>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Received" usd={ledger.received.usd} lbp={ledger.received.lbp} tone="in" />
            </div>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Change given" usd={ledger.changeGiven.usd} lbp={ledger.changeGiven.lbp} />
            </div>

            {/* Cash-outs have their own page, so this whole row is a link. */}
            <Link
                href={routes.driver.cashOuts}
                className={`${ROW} min-h-11 border-b border-line text-[15px] hover:bg-canvas`}
            >
                <span className="flex items-center gap-1">
                    Cash-outs <Icon name="chevronRight" size={14} className="text-muted" />
                </span>
                <span className={`${NUM} text-danger`}>{formatNumber(ledger.cashOuts.usd, "USD", { signed: true })}</span>
                <span className={`${NUM} text-danger`}>{formatNumber(ledger.cashOuts.lbp, "LBP", { signed: true })}</span>
            </Link>

            <div className={`${ROW} min-h-14 bg-canvas`}>
                <span className="font-heading font-bold">Expected cash</span>
                <span className={`${NUM} text-base font-semibold`}>{formatNumber(ledger.expected.usd, "USD")}</span>
                <span className={`${NUM} text-base font-semibold`}>{formatNumber(ledger.expected.lbp, "LBP")}</span>
            </div>
        </Card>
    );
}
