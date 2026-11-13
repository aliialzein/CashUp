import { describe, expect, it } from "@jest/globals";
import type { OwnerCashUpSummaryDto, OwnerSaleDeletionRequestDto } from "@/modules/cash-ups/cash-ups.types";
import {
    CASH_UP_FILTERS,
    hasWaitingRequest,
    isReturned,
    matchesFilter,
    nextStep,
    statusBadge,
    summarizeOwnerHome,
} from "@/lib/owner/cashUpOverview";

function request(canDecide: boolean): OwnerSaleDeletionRequestDto {
    return {
        id: "r1",
        type: "DELETE_SALE",
        cashUpId: "c1",
        saleId: "s1",
        status: canDecide ? "AWAITING_OWNER" : "APPROVED",
        reason: "Client returned the order",
        requestedById: "m1",
        decidedById: null,
        decisionReason: null,
        selfApproved: false,
        createdAt: "2026-11-12T10:00:00.000Z",
        decidedAt: null,
        saleNumber: 1,
        requestedByName: "Mohamad",
        decidedByName: null,
        canDecide,
    };
}

function cashUp(overrides: Partial<OwnerCashUpSummaryDto> = {}): OwnerCashUpSummaryDto {
    return {
        id: "c1",
        number: 7,
        status: "OPEN",
        openedAt: "2026-11-12T06:30:00.000Z",
        staffName: "Mohamad",
        salesCount: 2,
        returnReason: null,
        voidReason: null,
        canReview: false,
        requests: [],
        ...overrides,
    };
}

describe("isReturned", () => {
    it("is true only for an open cash-up with a return reason", () => {
        expect(isReturned(cashUp({ returnReason: "Count the LBP again" }))).toBe(true);
        expect(isReturned(cashUp())).toBe(false);
        expect(isReturned(cashUp({ status: "SUBMITTED", returnReason: "old reason" }))).toBe(false);
    });
});

describe("hasWaitingRequest", () => {
    it("counts only requests the owner can still decide", () => {
        expect(hasWaitingRequest(cashUp({ requests: [request(false)] }))).toBe(false);
        expect(hasWaitingRequest(cashUp({ requests: [request(false), request(true)] }))).toBe(true);
    });
});

describe("matchesFilter", () => {
    const open = cashUp();
    const returned = cashUp({ returnReason: "Count again" });
    const submitted = cashUp({ status: "SUBMITTED", canReview: true });
    const approved = cashUp({ status: "APPROVED" });
    const withRequest = cashUp({ requests: [request(true)] });

    it("keeps open and returned apart", () => {
        expect(matchesFilter(open, "OPEN")).toBe(true);
        expect(matchesFilter(returned, "OPEN")).toBe(false);
        expect(matchesFilter(returned, "RETURNED")).toBe(true);
    });

    it("matches each status filter", () => {
        expect(matchesFilter(submitted, "TO_REVIEW")).toBe(true);
        expect(matchesFilter(approved, "APPROVED")).toBe(true);
        expect(matchesFilter(withRequest, "REQUESTS")).toBe(true);
        expect(matchesFilter(open, "REQUESTS")).toBe(false);
    });

    it("shows everything under All", () => {
        for (const item of [open, returned, submitted, approved, withRequest]) {
            expect(matchesFilter(item, "ALL")).toBe(true);
        }
    });

    it("has one chip per filter", () => {
        expect(new Set(CASH_UP_FILTERS.map((filter) => filter.id)).size).toBe(CASH_UP_FILTERS.length);
    });
});

describe("statusBadge", () => {
    it("labels each status, and a returned cash-up as Returned", () => {
        expect(statusBadge(cashUp())).toEqual({ label: "Open", tone: "neutral" });
        expect(statusBadge(cashUp({ returnReason: "Again" }))).toEqual({ label: "Returned", tone: "warning" });
        expect(statusBadge(cashUp({ status: "SUBMITTED" }))).toEqual({ label: "Submitted", tone: "info" });
        expect(statusBadge(cashUp({ status: "APPROVED" }))).toEqual({ label: "Approved", tone: "success" });
        expect(statusBadge(cashUp({ status: "VOID" }))).toEqual({ label: "Cancelled", tone: "neutral" });
    });
});

describe("nextStep", () => {
    it("puts a waiting request first", () => {
        expect(nextStep(cashUp({ status: "SUBMITTED", canReview: true, requests: [request(true)] })).label)
            .toBe("Decide on a request");
    });

    it("asks to review only when the owner may review", () => {
        expect(nextStep(cashUp({ status: "SUBMITTED", canReview: true })).label).toBe("Review");
        expect(nextStep(cashUp({ status: "SUBMITTED", canReview: false })).label).toBe("Waiting for review");
    });

    it("describes open, returned and closed cash-ups", () => {
        expect(nextStep(cashUp()).label).toBe("In progress");
        expect(nextStep(cashUp({ returnReason: "Again" })).label).toBe("With driver");
        expect(nextStep(cashUp({ status: "APPROVED" })).label).toBe("Locked");
        expect(nextStep(cashUp({ status: "VOID" })).label).toBe("Cancelled");
    });
});

describe("summarizeOwnerHome", () => {
    it("counts what needs the owner, what is open and what is approved", () => {
        const summary = summarizeOwnerHome([
            cashUp({ id: "a", status: "SUBMITTED", canReview: true }),
            cashUp({ id: "b", status: "SUBMITTED", canReview: false }),
            cashUp({ id: "c", requests: [request(true), request(true), request(false)] }),
            cashUp({ id: "d", returnReason: "Again" }),
            cashUp({ id: "e", status: "APPROVED" }),
        ]);
        expect(summary.toReview.map((item) => item.id)).toEqual(["a"]);
        expect(summary.waitingRequests).toBe(2);
        expect(summary.open.map((item) => item.id)).toEqual(["c", "d"]);
        expect(summary.approvedCount).toBe(1);
    });

    it("is all zero for a new business", () => {
        expect(summarizeOwnerHome([])).toEqual({ toReview: [], waitingRequests: 0, open: [], approvedCount: 0 });
    });
});
