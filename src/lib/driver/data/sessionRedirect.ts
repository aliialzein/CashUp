import "server-only";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors/service-errors";

/** The backend could not find a usable driver behind this request: no session, no business, or an inactive membership. */
function isSessionError(error: unknown): boolean {
    return error instanceof UnauthenticatedError || (error instanceof ForbiddenError && error.code === "ACTOR_NOT_ACTIVE");
}

/** The member is signed in and active, but not allowed here (for example an owner of a business that has drivers). */
function isPlainForbidden(error: unknown): error is ForbiddenError {
    return error instanceof ForbiddenError && error.code !== "ACTOR_NOT_ACTIVE";
}

/**
 * Runs a driver read; when the backend finds no usable driver behind the request, leaves the page instead of crashing it.
 * - No session, no business, inactive: getCurrentUser() decides, no user goes to login, a user goes to onboarding.
 * - An owner who does not work on their own may not run cash-ups: they go to their own workspace.
 * Any other error is passed on unchanged.
 */
export async function withSessionRedirect<T>(read: () => Promise<T>): Promise<T> {
    let forbidden: ForbiddenError | undefined;
    try {
        return await read();
    } catch (error) {
        if (isPlainForbidden(error)) forbidden = error;
        else if (!isSessionError(error)) throw error;
    }
    // Outside the try: redirect() works by throwing, so a catch must never swallow it.
    const user = await getCurrentUser();
    if (forbidden) {
        if (user?.membership?.role === "OWNER") redirect(routes.owner.home);
        throw forbidden;
    }
    redirect(user ? routes.onboarding : routes.login);
}
