import { describe, expect, it } from "@jest/globals";
import { historyOrigin } from "../../../../src/lib/driver/navigation/historyOrigin";

describe("historyOrigin", () => {
    it("keeps a known page the cash-up was opened from", () => {
        expect(historyOrigin("today")).toBe("today");
        expect(historyOrigin("history")).toBe("history");
    });

    it("uses History when there is no origin", () => {
        expect(historyOrigin(undefined)).toBe("history");
    });

    it("uses History for anything that is not a known page", () => {
        expect(historyOrigin("https://evil.example")).toBe("history");
        expect(historyOrigin(["today", "sales"])).toBe("history");
    });
});
