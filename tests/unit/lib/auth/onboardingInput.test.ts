import { describe, expect, it } from "@jest/globals";
import {
    businessNameError,
    joinCodeError,
    ONBOARDING_ERRORS,
    toJoinCode,
} from "@/lib/auth/onboardingInput";

describe("toJoinCode", () => {
    it("makes the code uppercase and removes spaces and dashes", () => {
        expect(toJoinCode("ab2c-de3f ghj4")).toBe("AB2CDE3FGHJ4");
    });

    it("keeps an empty field empty", () => {
        expect(toJoinCode("")).toBe("");
    });
});

describe("businessNameError", () => {
    it("asks for a name when the field is empty or only spaces", () => {
        expect(businessNameError("")).toBe(ONBOARDING_ERRORS.nameRequired);
        expect(businessNameError("   ")).toBe(ONBOARDING_ERRORS.nameRequired);
    });

    it("accepts any name with text", () => {
        expect(businessNameError("Ali's Deliveries")).toBeUndefined();
    });
});

describe("joinCodeError", () => {
    it("asks for the code when the field is empty", () => {
        expect(joinCodeError("")).toBe(ONBOARDING_ERRORS.codeRequired);
    });

    it("refuses a code that is not 12 characters", () => {
        expect(joinCodeError("AB2C")).toBe(ONBOARDING_ERRORS.codeLength);
        expect(joinCodeError("AB2CDE3FGHJ45")).toBe(ONBOARDING_ERRORS.codeLength);
    });

    it("accepts a 12 character code", () => {
        expect(joinCodeError("AB2CDE3FGHJ4")).toBeUndefined();
    });
});
