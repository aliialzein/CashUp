import "server-only";
import { mapCashUp } from "@/lib/driver/mappers/cashUp";
import { mapCashUpSummary } from "@/lib/driver/mappers/cashUpSummary";
import { mapSavedCount } from "@/lib/driver/mappers/savedCount";
import {
    getOwnCashUp,
    getOwnCounts,
    getOwnOpenCashUp,
    listOwnCashUps,
} from "@/modules/cash-ups/cash-ups.service";
import type { CashUpDto } from "@/modules/cash-ups/cash-ups.types";
import { EntityNotFoundError } from "@/shared/errors/service-errors";
import { pageQuery, uuid } from "@/shared/validation/common";
import type { CashUpSummary } from "@/types/driver/cash-up";
import type { DriverDataSource } from "./driverDataSource";

/** Only submitted and approved cash-ups have a detail page. Open ones live on Today; VOID never shows. */
function isLocked(status: CashUpDto["status"]): boolean {
    return status === "SUBMITTED" || status === "APPROVED";
}

/**
 * Reads from the backend services. No mock data here.
 * Each service finds the logged-in driver itself from the session cookie, so nothing is passed in.
 */
export const realDriverData: DriverDataSource = {
    async getOpenCashUp() {
        // BACKEND: the driver's open cash-up (a returned one counts as open), with sales, cash-outs and ledger.
        const own = await getOwnOpenCashUp();
        if (own === null) return null;

        // The backend fills the ledger for every OPEN cash-up. Anything else is a backend bug: fail loudly.
        // This one check also narrows `status` and `ledger` for TypeScript, so no cast is needed.
        if (own.status !== "OPEN" || own.ledger === null) throw new Error("OPEN_CASH_UP_WITHOUT_LEDGER");

        // BACKEND: the count saved so far, so Count cash can show it again.
        const saved = await getOwnCounts(own.id);

        // Cash-outs keep their deleted flag here; screens decide what to hide.
        return mapCashUp({ ...own, status: own.status, ledger: own.ledger, savedCounts: mapSavedCount(saved) });
    },

    async getHistory() {
        // BACKEND: the driver's own cash-ups, newest first (first page only).
        const rows = await listOwnCashUps(pageQuery.parse({}));

        const summaries: CashUpSummary[] = [];
        for (const row of rows) {
            // VOID cash-ups never show on the driver's screens.
            if (row.status === "VOID") continue;
            summaries.push(mapCashUpSummary({ ...row, status: row.status }));
        }
        return summaries;
    },

    async getCashUpDetail(id: string) {
        // The id comes from the URL, so anyone can type anything. Check it before the backend sees it.
        if (!uuid.safeParse(id).success) return null;

        // BACKEND: one of the driver's own cash-ups, with its sales and cash-outs.
        let ownCashUp;
        try {
            ownCashUp = await getOwnCashUp(id);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
        if (!isLocked(ownCashUp.status)) return null;

        // NEXT STEP: CashUpOwnDto now has `number` and USD/LBP pair columns. Map it to a CashUpDetail, then remove this line.
        throw new Error("CASH_UP_DETAIL_NOT_MAPPED");
    },
};
