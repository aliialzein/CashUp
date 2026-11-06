import { describe, expect, it } from "@jest/globals";
import { isNavActive, phoneChrome, type NavItem } from "../../../../src/components/driver/layout/navigation";

const today: NavItem = { label: "Today", href: "/today", icon: "sheet", activePaths: ["/today", "/sales"] };

describe("isNavActive", () => {
    it("is active on one of its pages", () => {
        expect(isNavActive("/today", today)).toBe(true);
    });

    it("is active inside one of its pages", () => {
        expect(isNavActive("/sales/new", today)).toBe(true);
    });

    it("is not active on another page, and not for a path that only starts with the same letters", () => {
        expect(isNavActive("/history", today)).toBe(false);
        expect(isNavActive("/sales-report", today)).toBe(false);
    });

    it("is never active while the address is not known", () => {
        expect(isNavActive(null, today)).toBe(false);
    });
});

describe("phoneChrome", () => {
    it("shows the business bar and the tabs on Today, History and Account", () => {
        for (const path of ["/today", "/history", "/account"]) {
            expect(phoneChrome(path)).toEqual({ businessBar: true, tabs: true });
        }
    });

    it("shows only the tabs inside a History cash-up", () => {
        expect(phoneChrome("/history/c-42")).toEqual({ businessBar: false, tabs: true });
        expect(phoneChrome("/history/c-42/sales")).toEqual({ businessBar: false, tabs: true });
    });

    it("shows neither bar on forms and pages inside a flow", () => {
        for (const path of ["/sales/new", "/cash-outs", "/count-cash", "/start", "/account/switch-business"]) {
            expect(phoneChrome(path)).toEqual({ businessBar: false, tabs: false });
        }
    });

    it("shows both bars while the address is not known yet", () => {
        expect(phoneChrome(null)).toEqual({ businessBar: true, tabs: true });
    });
});
