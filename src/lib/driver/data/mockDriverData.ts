import { findMockCashUpDetail } from "@/lib/driver/mock/cash-up-details";
import { mockHistory } from "@/lib/driver/mock/history";
import { mockSession } from "@/lib/driver/mock/session";
import { mockFloatSuggestion } from "@/lib/driver/mock/start-cash-up";
import { getOpenCashUp } from "@/lib/driver/mock/today";
import type { DriverDataSource } from "./driverDataSource";

/** Fake data for building screens before the backend is ready. Delete together with the mock folder. */
export const mockDriverData: DriverDataSource = {
    async getOpenCashUp() {
        return getOpenCashUp();
    },

    async getHistory() {
        return mockHistory;
    },

    async getCashUpDetail(id) {
        return findMockCashUpDetail(id) ?? null;
    },

    // The mock session keeps its own driver/cashier wording.
    async getIdentity() {
        const isDriver = mockSession.role === "DRIVER";
        return {
            businessName: mockSession.businessName,
            userName: mockSession.userName,
            roleLabel: isDriver ? "Driver" : "Cashier",
            feeRequired: isDriver,
        };
    },

    async getFloatSuggestion() {
        return mockFloatSuggestion;
    },
};
