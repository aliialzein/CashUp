import "server-only";

import { UnauthenticatedError } from "@/http/errors";
import { getHttpDeps } from "@/server/composition";

interface Session {
	userId: string;
	businessId: string;
}

/**
 * Who is using the app right now?
 * TODAY: the two ids come from .env (dev stub).
 * TASK 4D: replace only this function with the real login session.
 */
export function getSession(): Session {
	const devAuthOn =
		process.env.NODE_ENV !== "production" && process.env.CASHUP_DEV_AUTH === "1";
	const userId = process.env.CASHUP_DEV_USER_ID;
	const businessId = process.env.CASHUP_DEV_BUSINESS_ID;

	if (!devAuthOn || !userId || !businessId) throw new UnauthenticatedError();
	return { userId, businessId };
}

/** Session -> Actor (membership checked in the database), plus the services to call. */
export async function currentActor() {
	const deps = getHttpDeps();
	const { userId, businessId } = getSession();
	const actor = await deps.actorResolver.resolve(userId, businessId);
	return { deps, actor };
}
