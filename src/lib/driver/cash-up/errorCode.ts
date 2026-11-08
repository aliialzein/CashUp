import { ZodError } from "zod";
import { UnauthenticatedError } from "@/http/errors";
import { ServiceError } from "@/services/errors";

/** Turns anything thrown into a short code the screens understand. */
export function toErrorCode(error: unknown): string {
    if (error instanceof ZodError)
        return "VALIDATION_ERROR";

    if (error instanceof UnauthenticatedError)
        return "UNAUTHENTICATED";

    if (error instanceof ServiceError)
        return error.code;

    return "INTERNAL_ERROR";
}
