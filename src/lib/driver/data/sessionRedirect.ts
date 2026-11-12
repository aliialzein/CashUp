import "server-only";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors/service-errors";

/** The backend could not find a usable driver behind this request: no session, no business, or an inactive membership. */
function isSessionError(error: unknown): boolean {
    return error instanceof UnauthenticatedError || (error instanceof ForbiddenError && error.code === "ACTOR_NOT_ACTIVE");
}

/**
 * Runs a driver read; when the backend finds no usable session, leaves the page instead of crashing it.
 * The backend throws UnauthenticatedError both for "logged out" and "logged in without a business",
 * so getCurrentUser() decides: no user goes to the login page, a user goes to onboarding.
 * Any other error is passed on unchanged.
 */
export async function withSessionRedirect<T>(read: () => Promise<T>): Promise<T> {
    try {
        return await read();
    } catch (error) {
        if (!isSessionError(error)) throw error;
    }
    // Outside the try: redirect() works by throwing, so a catch must never swallow it.
    const user = await getCurrentUser();
    redirect(user ? routes.onboarding : routes.login);
}
