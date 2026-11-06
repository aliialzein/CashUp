import type { ComponentType } from "react";
import { HISTORY_CARD_STYLE, type HistoryCardStyle } from "@/lib/driver/history/cardStyle";
import type { CashUpSummary } from "@/types/driver/cash-up";
import { HistoryCardPlain, HistoryCardRow } from "./HistoryCardPlain";
import { HistoryCardTagged } from "./HistoryCardTagged";

type CardProps = { item: CashUpSummary };

/** `listClass` is the spacing, and the box when the whole list is one. A tag that sticks out needs more room. */
const STYLES: Record<HistoryCardStyle, { Card: ComponentType<CardProps>; listClass: string }> = {
    plain: { Card: HistoryCardPlain, listClass: "gap-[3px]" },
    tagged: { Card: HistoryCardTagged, listClass: "gap-5 pt-3" },
    grouped: {
        Card: HistoryCardRow,
        listClass: "overflow-hidden rounded-xl border border-line bg-surface divide-y divide-subtle",
    },
};

/** Phone only: one card per cash-up, in the style chosen in `cardStyle.ts`. */
export function HistoryCards({ items }: { items: CashUpSummary[] }) {
    const { Card, listClass } = STYLES[HISTORY_CARD_STYLE];
    return (
        <ul aria-label="Cash-ups" className={`flex flex-col ${listClass}`}>
            {items.map((item) => (
                <Card key={item.id} item={item} />
            ))}
        </ul>
    );
}
