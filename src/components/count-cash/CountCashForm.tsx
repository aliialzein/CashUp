"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { totalOfNotes } from "@/lib/count-cash/calculations";
import { emptyCounts } from "@/lib/count-cash/denominations";
import type { Amounts } from "@/lib/format/money";
import { subtractAmounts } from "@/lib/money/amounts";
import { routes } from "@/lib/routes";
import { COUNT_CASH_FORM_ID } from "./formId";
import { CountSummary } from "./CountSummary";
import { NotesTable } from "./NotesTable";

type CountCashFormProps = {
    /** What the drawer should hold, per currency, calculated by the server. */
    expected: Amounts;
};

export function CountCashForm({ expected }: CountCashFormProps) {
    const router = useRouter();
    const [usdCounts, setUsdCounts] = useState(() => emptyCounts("USD"));
    const [lbpCounts, setLbpCounts] = useState(() => emptyCounts("LBP"));

    function reset() {
        setUsdCounts(emptyCounts("USD"));
        setLbpCounts(emptyCounts("LBP"));
    }

    const counted: Amounts = { usd: totalOfNotes(usdCounts), lbp: totalOfNotes(lbpCounts) };
    const gap = subtractAmounts(counted, expected);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // TODO: send { usdCounts, lbpCounts } to the API.
        reset();
        router.push(routes.driver.today);
    }

    return (
        <form id={COUNT_CASH_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 items-start gap-6">
                <NotesTable
                    currency="USD"
                    counts={usdCounts}
                    onChange={setUsdCounts}
                    onReset={() => setUsdCounts(emptyCounts("USD"))}
                />
                <NotesTable
                    currency="LBP"
                    counts={lbpCounts}
                    onChange={setLbpCounts}
                    onReset={() => setLbpCounts(emptyCounts("LBP"))}
                />
            </div>
            <CountSummary counted={counted} expected={expected} gap={gap} />
        </form>
    );
}
