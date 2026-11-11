import "server-only";
import { mapCashUp } from "@/lib/driver/mappers/cashUp";
import { mapCashUpDetail, type LockedStatus } from "@/lib/driver/mappers/cashUpDetail";
import { mapCashUpSummary } from "@/lib/driver/mappers/cashUpSummary";
import { mapSavedCount } from "@/lib/driver/mappers/savedCount";
import { roleIdentity } from "@/lib/driver/session/roleIdentity";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { getBusiness } from "@/modules/business/business.service";
import {
    getOwnCashUp,
    getOwnCounts,
    getOwnOpenCashUp,
    listOwnCashUps,
} from "@/modules/cash-ups/cash-ups.service";
import type { CashUpDto } from "@/modules/cash-ups/cash-ups.types";
import { EntityNotFoundError, UnauthenticatedError } from "@/shared/errors/service-errors";
import { pageQuery, uuid } from "@/shared/validation/common";
import type { CashUpSummary } from "@/types/driver/cash-up";
import type { DriverDataSource } from "./driverDataSource";
import { withSessionRedirect } from "./sessionRedirect";

/** Only submitted and approved cash-ups have a detail page. Open and returned ones live on Today; VOID never shows. */
function isLocked(status: CashUpDto["status"]): status is LockedStatus {
    return status === "SUBMITTED" || status === "APPROVED";
}

/**
 * Reads from the backend services. No mock data here.
 * Each service finds the logged-in driver itself from the session cookie, so nothing is passed in.
 */
const backendReads: DriverDataSource = {
    async getOpenCashUp() {
        // BACKEND: the driver's open cash-up (a returned one counts as open), with sales, cash-outs and ledger.
        const own = await getOwnOpenCashUp();
        if (own === null) return null;

        // getOwnOpenCashUp only returns OPEN cash-ups; anything else is a backend bug: fail loudly.
        // This one check also narrows `status` for TypeScript, so no cast is needed. The ledger is always present now.
        if (own.status !== "OPEN") throw new Error("OPEN_CASH_UP_NOT_OPEN");

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
        const { status } = ownCashUp;
        if (!isLocked(status)) return null;

        return mapCashUpDetail({ ...ownCashUp, status });
    },

    async getIdentity() {
        // BACKEND: the signed-in user (name) and the business of their membership (name, their role).
        const [user, business] = await Promise.all([getCurrentUser(), getBusiness()]);
        if (user === null) throw new UnauthenticatedError();
        return { businessName: business.name, userName: user.fullName, ...roleIdentity(business.role) };
    },

    async getFloatSuggestion() {
        // The backend has no float suggestion yet: real mode starts with empty float fields (team decision, run 8).
        return null;
    },
};

/** The backend reads, each sending a driver without a usable session to /login or /onboarding instead of crashing the page. */
export const realDriverData: DriverDataSource = {
    getOpenCashUp: () => withSessionRedirect(() => backendReads.getOpenCashUp()),
    getHistory: () => withSessionRedirect(() => backendReads.getHistory()),
    getCashUpDetail: (id) => withSessionRedirect(() => backendReads.getCashUpDetail(id)),
    getIdentity: () => withSessionRedirect(() => backendReads.getIdentity()),
    getFloatSuggestion: () => backendReads.getFloatSuggestion(),
};
