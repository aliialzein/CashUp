export type HistoryCardStyle = "plain" | "tagged" | "grouped";

/**
 * Which card the phone History list uses. All stay built: change this one word to switch.
 * "plain": a box per cash-up, badge next to the title.
 * "tagged": a box per cash-up, badge on the top border, border in the status colour.
 * "grouped": one box for the whole list, rows separated by thin lines.
 */
export const HISTORY_CARD_STYLE = "plain" as HistoryCardStyle;
