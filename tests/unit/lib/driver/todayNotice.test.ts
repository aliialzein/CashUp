import { describe, expect, it } from "@jest/globals";
import { todayAfter, todayNotice } from "@/lib/driver/count-cash/todayNotice";

describe("todayAfter", () => {
    it("sends the driver to Today with what was done", () => {
        expect(todayAfter("count-saved")).toBe("/today?done=count-saved");
        expect(todayAfter("submitted")).toBe("/today?done=submitted");
    });
});

describe("todayNotice", () => {
    it("gives the green line for each known word", () => {
        expect(todayNotice("count-saved")).toBe("Count saved. You can finish it later.");
        expect(todayNotice("submitted")).toBe("Cash-up submitted. The owner will review it.");
    });

    it("shows nothing for a missing, unknown or repeated word (the URL can be typed by anyone)", () => {
        expect(todayNotice(undefined)).toBeNull();
        expect(todayNotice("hello")).toBeNull();
        expect(todayNotice("constructor")).toBeNull();
        expect(todayNotice(["submitted", "count-saved"])).toBeNull();
    });
});
