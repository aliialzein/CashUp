import "server-only";
import { currentActor } from "@/server/context";
import { findOwnOpenCashUp } from "@/server/driver/ownOpenCashUp";
import type { CashUpDto } from "@/services/dto";
import { EntityNotFoundError } from "@/services/errors";
import { pageQuery, uuid } from "@/validation";
import type { DriverDataSource } from "./driverDataSource";

/** Only submitted and approved cash-ups have a detail page. Open ones live on Today; VOID never shows. */
function isLocked(status: CashUpDto["status"]): boolean {
    return status === "SUBMITTED" || status === "APPROVED";
}

/** Reads from the backend services. No mock data here. */
export const realDriverData: DriverDataSource = {
    async getOpenCashUp() {
        // BACKEND: asks the services for the driver's newest cash-ups and keeps the open one.
        const { deps, actor } = await currentActor();
        const openCashUp = await findOwnOpenCashUp(deps.queries, actor);
        if (openCashUp === null) return null;

        // BACKEND GAP: CashUpOwnDto has no USD/LBP pair columns yet, so mapCashUp cannot read it.
        // When it has them: deps.queries.getOwn(actor, openCashUp.id), then mapCashUp(...).
        throw new Error("OPEN_CASH_UP_NOT_MAPPED");
    },

    async getHistory() {
        // BACKEND: asks the services for the driver's own cash-ups, newest first (first page only).
        const { deps, actor } = await currentActor();
        const rows = await deps.queries.listOwn(actor, pageQuery.parse({}));
        if (rows.length === 0) return [];

        // BACKEND GAP: CashUpDto has no `number` or `salesCount`, so mapCashUpSummary cannot read it.
        // When it has them: drop VOID rows, then rows.map(mapCashUpSummary).
        throw new Error("HISTORY_NOT_MAPPED");
    },

    async getCashUpDetail(id) {
        // The id comes from the URL, so anyone can type anything. Check it before the backend sees it.
        if (!uuid.safeParse(id).success) return null;

        // BACKEND: asks the services for one of the driver's own cash-ups, with its sales and cash-outs.
        const { deps, actor } = await currentActor();
        let ownCashUp;
        try {
            ownCashUp = await deps.queries.getOwn(actor, id);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
        if (!isLocked(ownCashUp.status)) return null;

        // BACKEND GAP: CashUpOwnDto has no `number` and no USD/LBP pair columns, so it cannot become a CashUpDetail.
        throw new Error("CASH_UP_DETAIL_NOT_MAPPED");
    },
};
