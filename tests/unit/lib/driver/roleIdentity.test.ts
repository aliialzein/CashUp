import { describe, expect, it } from "@jest/globals";
import { roleIdentity } from "@/lib/driver/session/roleIdentity";

describe("roleIdentity", () => {
    it("shows a STAFF member as a driver who must enter the delivery fee", () => {
        expect(roleIdentity("STAFF")).toEqual({ roleLabel: "Driver", feeRequired: true });
    });

    it("shows a MANAGER as a manager who may leave the fee empty", () => {
        expect(roleIdentity("MANAGER")).toEqual({ roleLabel: "Manager", feeRequired: false });
    });

    it("shows an OWNER as an owner who may leave the fee empty", () => {
        expect(roleIdentity("OWNER")).toEqual({ roleLabel: "Owner", feeRequired: false });
    });
});
