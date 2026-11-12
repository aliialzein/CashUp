import { describe, expect, it } from "@jest/globals";
import { mapSavedCount } from "@/lib/driver/mappers/savedCount";

describe("mapSavedCount", () => {
    it("returns null when no count is saved yet", () => {
        expect(mapSavedCount({ saved: false, lines: [] })).toBeNull();
    });

    it("turns backend note names into screen note names, and keeps 0.10 as it is", () => {
        const counts = mapSavedCount({
            saved: true,
            lines: [
                { currency: "USD", denomination: "100.00", quantity: 3 },
                { currency: "USD", denomination: "0.10", quantity: 5 },
                { currency: "LBP", denomination: "100000.00", quantity: 2 },
            ],
        });

        expect(counts?.USD["100"]).toBe(3);
        expect(counts?.USD["0.10"]).toBe(5);
        expect(counts?.LBP["100000"]).toBe(2);
    });

    it("shows 0 for every note that was not counted", () => {
        const counts = mapSavedCount({
            saved: true,
            lines: [{ currency: "USD", denomination: "20.00", quantity: 1 }],
        });

        expect(counts?.USD["50"]).toBe(0);
        expect(counts?.LBP["1000"]).toBe(0);
    });

    it("skips a note the screens do not know, so no ghost row appears", () => {
        const counts = mapSavedCount({
            saved: true,
            lines: [{ currency: "USD", denomination: "2.00", quantity: 4 }],
        });

        expect(counts?.USD).not.toHaveProperty("2");
    });
});
