import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { ConflictError, ForbiddenError, UnauthenticatedError } from "@/shared/errors/service-errors";

type FakeCall = (...args: unknown[]) => Promise<unknown>;

const getCurrentUser = jest.fn<FakeCall>();
/** Like the real redirect(): it never returns, it throws. */
const redirect = jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
});

let withSessionRedirect: <T>(read: () => Promise<T>) => Promise<T>;

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("next/navigation", () => ({ redirect }));
    jest.doMock("../../../../src/modules/auth/auth.service", () => ({ getCurrentUser }));
    ({ withSessionRedirect } = await import("../../../../src/lib/driver/data/sessionRedirect"));
});

describe("withSessionRedirect", () => {
    it("returns what the read returns when the session is fine", async () => {
        await expect(withSessionRedirect(async () => "cash-up")).resolves.toBe("cash-up");
        expect(redirect).not.toHaveBeenCalled();
    });

    it("sends a request without a session to the login page", async () => {
        getCurrentUser.mockResolvedValue(null);

        await expect(withSessionRedirect(() => Promise.reject(new UnauthenticatedError()))).rejects.toThrow("NEXT_REDIRECT /login");
        expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("sends a logged-in user without a business to onboarding", async () => {
        // The backend throws UnauthenticatedError here too; the user from getCurrentUser tells the two apart.
        getCurrentUser.mockResolvedValue({ id: "user-1", membership: null });

        await expect(withSessionRedirect(() => Promise.reject(new UnauthenticatedError()))).rejects.toThrow(
            "NEXT_REDIRECT /onboarding",
        );
        expect(redirect).toHaveBeenCalledWith("/onboarding");
    });

    it("sends a user whose membership is not active to onboarding", async () => {
        getCurrentUser.mockResolvedValue({ id: "user-1", membership: { status: "INACTIVE" } });

        await expect(withSessionRedirect(() => Promise.reject(new ForbiddenError("ACTOR_NOT_ACTIVE")))).rejects.toThrow(
            "NEXT_REDIRECT /onboarding",
        );
    });

    it("sends an owner who may not run cash-ups to the owner workspace", async () => {
        // An owner whose business has drivers ("I work on my own" not ticked) gets a plain ForbiddenError on driver reads.
        getCurrentUser.mockResolvedValue({ id: "user-1", membership: { status: "ACTIVE", role: "OWNER" } });

        await expect(withSessionRedirect(() => Promise.reject(new ForbiddenError()))).rejects.toThrow(
            "NEXT_REDIRECT /owner",
        );
        expect(redirect).toHaveBeenCalledWith("/owner");
    });

    it("passes a plain ForbiddenError on unchanged for anyone who is not an owner", async () => {
        const plainForbidden = new ForbiddenError();
        getCurrentUser.mockResolvedValue({ id: "user-1", membership: { status: "ACTIVE", role: "STAFF" } });

        await expect(withSessionRedirect(() => Promise.reject(plainForbidden))).rejects.toBe(plainForbidden);
        expect(redirect).not.toHaveBeenCalled();
    });

    it("passes every other error on unchanged, without asking for the user or redirecting", async () => {
        const conflict = new ConflictError();

        await expect(withSessionRedirect(() => Promise.reject(conflict))).rejects.toBe(conflict);
        expect(getCurrentUser).not.toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
    });
});
