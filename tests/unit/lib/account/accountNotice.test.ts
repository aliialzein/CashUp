import { describe, expect, it } from "@jest/globals";
import { accountAfter, accountNotice } from "@/lib/account/accountNotice";

describe("accountNotice", () => {
    it("gives the green line after a password change", () => {
        expect(accountNotice("password-changed")).toBe("Password changed. Other devices were signed out.");
    });

    it.each([
        ["no value", undefined],
        ["an empty value", ""],
        ["another value", "submitted"],
        ["a name every object has (toString)", "toString"],
        ["constructor", "constructor"],
        ["the right value given twice (an array)", ["password-changed", "password-changed"]],
    ])("shows nothing for %s", (_case, done) => {
        expect(accountNotice(done)).toBeNull();
    });
});

describe("accountAfter", () => {
    it("sends the member to the Account page with ?done=", () => {
        expect(accountAfter("password-changed")).toBe("/account?done=password-changed");
    });
});
