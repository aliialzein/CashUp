import { describe, expect, it } from "@jest/globals";
import {
    isPasswordChangeValid,
    passwordErrors,
    passwordStrength,
} from "../../../../src/lib/account/password";

const change = (next: string, repeat = "", current = "OldPass1!") => ({ current, next, repeat });

describe("passwordErrors", () => {
    it("shows no errors for fields that are still empty", () => {
        expect(passwordErrors({ current: "", next: "", repeat: "" })).toEqual({});
    });

    it("names the first broken rule", () => {
        expect(passwordErrors(change("Ab1!")).next).toBe("Use at least 8 characters.");
        expect(passwordErrors(change("A1!" + "a".repeat(70))).next).toBe("Use at most 72 characters.");
        expect(passwordErrors(change("ABCDEFG1!")).next).toBe("Add a lowercase letter.");
        expect(passwordErrors(change("abcdefg1!")).next).toBe("Add an uppercase letter.");
        expect(passwordErrors(change("Abcdefgh!")).next).toBe("Add a number.");
        expect(passwordErrors(change("Abcdefg1")).next).toBe("Add a symbol, like ! or #.");
    });

    it("rejects the same password as the current one", () => {
        expect(passwordErrors(change("OldPass1!")).next).toBe("Choose a different password.");
    });

    it("accepts a password that follows every rule", () => {
        expect(passwordErrors(change("NewPass1!")).next).toBeUndefined();
    });

    it("says when the repeat does not match", () => {
        expect(passwordErrors(change("NewPass1!", "Different1!")).repeat).toBe("Passwords do not match.");
        expect(passwordErrors(change("NewPass1!", "NewPass1!")).repeat).toBeUndefined();
    });
});

describe("isPasswordChangeValid", () => {
    it("needs the current password, a password that follows the rules and a matching repeat", () => {
        expect(isPasswordChangeValid(change("NewPass1!", "NewPass1!"))).toBe(true);
        expect(isPasswordChangeValid(change("NewPass1!", "NewPass1!", ""))).toBe(false);
        expect(isPasswordChangeValid(change("newpass1!", "newpass1!"))).toBe(false);
        expect(isPasswordChangeValid(change("NewPass1!", "Other1234!"))).toBe(false);
        expect(isPasswordChangeValid(change("OldPass1!", "OldPass1!"))).toBe(false);
    });
});

describe("passwordStrength", () => {
    it("is weak while a rule is broken", () => {
        expect(passwordStrength("abc")).toBe("weak");
        expect(passwordStrength("abcdefgh1")).toBe("weak");
    });

    it("is moderate when every rule is met with 8 to 11 characters", () => {
        expect(passwordStrength("Abcdef1!")).toBe("moderate");
        expect(passwordStrength("Abcdefghi1!")).toBe("moderate");
    });

    it("is strong with 12 to 15 characters", () => {
        expect(passwordStrength("Abcdefghij1!")).toBe("strong");
        expect(passwordStrength("Abcdefghijklm1!")).toBe("strong");
    });

    it("is very strong with 16 characters or more", () => {
        expect(passwordStrength("Abcdefghijklmn1!")).toBe("very-strong");
    });
});
