import { findMockCashUpDetail } from "@/lib/driver/mock/cash-up-details";
import { mockHistory } from "@/lib/driver/mock/history";
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
};
