import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format/money";
import { routes } from "@/lib/routes";
import type { Amounts } from "@/lib/format/money";
import type { Ledger } from "@/types/cash-up";
import { CollapsibleLedger } from "./CollapsibleLedger";
import { HEADER_ROW, ROW, SUMMARY_ROW } from "./ledgerStyles";

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

/** The Cash-outs row opens the list of cash-outs behind this number. */
function CashOutsRow({ cashOuts, href }: { cashOuts: Amounts; href: string }) {
    return (
        <Link href={href} className={`${ROW} min-h-11 border-b border-line text-[15px] hover:bg-canvas`}>
            <span className="flex items-center gap-1">
                Cash-outs <Icon name="chevronRight" size={14} className="text-muted" />
            </span>
            <span className={`${NUM} text-danger`}>{formatNumber(cashOuts.usd, "USD", { signed: true })}</span>
            <span className={`${NUM} text-danger`}>{formatNumber(cashOuts.lbp, "LBP", { signed: true })}</span>
        </Link>
    );
}

type CashUpLedgerProps = {
    ledger: Ledger;
    /** Where the Cash-outs row goes. Today's cash-up uses the live Cash-outs page. */
    cashOutsHref?: string;
    /** Phone only: fold everything except Expected cash. Desktop always shows all rows. */
    collapsible?: boolean;
};

/** Where the cash in the drawer comes from. One column per currency, never mixed. */
export function CashUpLedger({ ledger, cashOutsHref = routes.driver.cashOuts, collapsible = false }: CashUpLedgerProps) {
    const header = (
        <>
            <span className="text-right">USD</span>
            <span className="text-right">LBP</span>
        </>
    );

    const details = (
        <>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Float" usd={ledger.float.usd} lbp={ledger.float.lbp} />
            </div>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Received" usd={ledger.received.usd} lbp={ledger.received.lbp} tone="in" />
            </div>
            <div className={`${ROW} min-h-11 border-b border-subtle text-[15px]`}>
                <Line label="Change given" usd={ledger.changeGiven.usd} lbp={ledger.changeGiven.lbp} />
            </div>
            <CashOutsRow cashOuts={ledger.cashOuts} href={cashOutsHref} />
        </>
    );

    const summary = (
        <>
            <span className="font-heading font-bold">Expected cash</span>
            <span className={`${NUM} text-base font-semibold`}>{formatNumber(ledger.expected.usd, "USD")}</span>
            <span className={`${NUM} text-base font-semibold`}>{formatNumber(ledger.expected.lbp, "LBP")}</span>
        </>
    );

    return (
        <Card as="section" aria-label="Cash in your drawer" className="overflow-hidden">
            {collapsible ? (
                <CollapsibleLedger header={header} details={details} summary={summary} />
            ) : (
                <>
                    <div className={HEADER_ROW}>
                        <span />
                        {header}
                    </div>
                    {details}
                    <div className={SUMMARY_ROW}>{summary}</div>
                </>
            )}
        </Card>
    );
}
