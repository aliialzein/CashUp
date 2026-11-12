import { describe, expect, it } from "@jest/globals";
import { originFromPath, resolveOrigin, withOrigin } from "../../../../src/lib/navigation/origin";
import { routes } from "../../../../src/lib/routes";

describe("withOrigin", () => {
    it("adds the page the form was opened from", () => {
        expect(withOrigin("/sales/new", "today")).toBe("/sales/new?from=today");
    });
});

describe("originFromPath", () => {
    it("finds the page of an exact path", () => {
        expect(originFromPath(routes.driver.sales)).toBe("sales");
        expect(originFromPath(routes.driver.account)).toBe("account");
    });

    it("finds the page of a path inside it", () => {
        expect(originFromPath(`${routes.driver.history}/12`)).toBe("history");
    });

    it("gives nothing for a path that is not a known page", () => {
        expect(originFromPath("/somewhere-else")).toBeUndefined();
    });
});

describe("resolveOrigin", () => {
    it("goes back to Today when the form was opened from Today", () => {
        expect(resolveOrigin("today", "sales")).toEqual({ href: routes.driver.today, label: "Today" });
    });

    it("goes back to Sales when the form was opened from Sales", () => {
        expect(resolveOrigin("sales", "today")).toEqual({ href: routes.driver.sales, label: "Sales" });
    });

    it("goes back to the page named in the address", () => {
        expect(resolveOrigin("cash-outs", "account")).toEqual({ href: routes.driver.cashOuts, label: "Cash-outs" });
        expect(resolveOrigin("history", "account")).toEqual({ href: routes.driver.history, label: "History" });
    });

    it("uses the fallback when there is no origin", () => {
        expect(resolveOrigin(undefined, "sales")).toEqual({ href: routes.driver.sales, label: "Sales" });
    });

    it("ignores anything that is not a known page", () => {
        const fallback = { href: routes.driver.sales, label: "Sales" };
        expect(resolveOrigin("https://evil.example", "sales")).toEqual(fallback);
        expect(resolveOrigin("../admin", "sales")).toEqual(fallback);
        expect(resolveOrigin("toString", "sales")).toEqual(fallback);
        expect(resolveOrigin(["today", "sales"], "sales")).toEqual(fallback);
    });
});
