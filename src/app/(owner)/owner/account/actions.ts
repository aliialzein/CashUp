"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { requireCurrentMember, requireOwnerPermission } from "@/modules/auth/auth.service";
import { setBusinessSolo } from "@/modules/business/business.service";
import { ServiceError, UnauthenticatedError } from "@/shared/errors/service-errors";

export type SoloActionResult = { ok: true; isSolo: boolean } | { ok: false; message: string };

const MESSAGES: Partial<Record<ServiceError["code"], string>> = {
  SOLO_CHANGE_BLOCKED:
    "You can't change this while other members are active or a cash-up is still unresolved. Finish or deactivate them first.",
  FORBIDDEN: "Only the owner can change this.",
  ACTOR_NOT_ACTIVE: "Your membership is inactive.",
  CONFLICT: "The business changed in the meantime. Refresh and try again.",
  ENTITY_NOT_FOUND: "Business not found.",
};

function failure(error: unknown): SoloActionResult {
  unstable_rethrow(error);
  if (error instanceof ZodError) return { ok: false, message: "Please check your details." };
  if (error instanceof ServiceError) return { ok: false, message: MESSAGES[error.code] ?? error.message };
  if (error instanceof UnauthenticatedError) return { ok: false, message: "Please sign in again." };
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Switches the business between solo and team, through the backend's setBusinessSolo (owner only). */
export async function setBusinessSoloAction(isSolo: boolean): Promise<SoloActionResult> {
  try {
    requireOwnerPermission(await requireCurrentMember());
    const business = await setBusinessSolo({ isSolo });
    for (const path of ["/owner/account", "/owner", "/owner/team"]) revalidatePath(path);
    return { ok: true, isSolo: business.isSolo };
  } catch (error) {
    return failure(error);
  }
}
