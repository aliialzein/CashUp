import { describe, expect, it } from "@jest/globals";
import { withoutSearchParam } from "@/lib/navigation/searchParam";

describe("withoutSearchParam", () => {
    it("removes the parameter and leaves a clean path", () => {
        expect(withoutSearchParam("/today?done=submitted", "done")).toBe("/today");
        expect(withoutSearchParam("http://localhost:3000/today?done=count-saved", "done")).toBe("/today");
    });

    it("keeps every other parameter and the #hash", () => {
        expect(withoutSearchParam("https://cashup.example/today?from=sales&done=submitted#top", "done")).toBe("/today?from=sales#top");
    });

    it("removes a parameter that appears more than once", () => {
        expect(withoutSearchParam("/today?done=submitted&done=count-saved", "done")).toBe("/today");
    });

    it("leaves an address without the parameter unchanged", () => {
        expect(withoutSearchParam("/today?from=sales", "done")).toBe("/today?from=sales");
        expect(withoutSearchParam("/today", "done")).toBe("/today");
    });
});
