import { ZodError } from "zod";
import { ServiceError, UnauthenticatedError } from "@/shared/errors/service-errors";
import { getStableIssueCode } from "@/shared/validation/common";
import { isKnownValidationCode } from "./actionResult";

type ValidationIssue = ZodError["issues"][number];

/**
 * The backend puts a stable code in one of two places: `params.stableCode` (addStableIssue)
 * or only in `message` (a `.regex` / `.refine` with `{ error: "CODE" }`). Read both.
 */
function stableCodeOf(issue: ValidationIssue): string {
    const fromParams = getStableIssueCode(issue);
    return isKnownValidationCode(fromParams) ? fromParams : issue.message;
}

/** The first issue with a code the driver has a text for; anything else stays the general VALIDATION_ERROR. */
function validationCode(error: ZodError): string {
    return error.issues.map(stableCodeOf).find(isKnownValidationCode) ?? "VALIDATION_ERROR";
}

/** Turns anything thrown into a short code the screens understand. */
export function toErrorCode(error: unknown): string {
    if (error instanceof ZodError)
        return validationCode(error);

    if (error instanceof UnauthenticatedError)
        return "UNAUTHENTICATED";

    if (error instanceof ServiceError)
        return error.code;

    return "INTERNAL_ERROR";
}
