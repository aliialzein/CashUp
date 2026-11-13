"use client";

import { Store, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { setBusinessSoloAction } from "@/app/(owner)/owner/account/actions";

type SoloBusinessCardProps = {
  businessName: string;
  isSolo: boolean;
  /** Active members other than the owner. The backend refuses "solo" while there are any. */
  otherActiveMembers: number;
};

/** Business name and type, with the owner-only switch between solo and team (backend: setBusinessSolo). */
export function SoloBusinessCard({ businessName, isSolo, otherActiveMembers }: SoloBusinessCardProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const target = !isSolo;
  const blocked = target && otherActiveMembers > 0;
  const TypeIcon = isSolo ? Store : Users;

  function change() {
    setError(undefined);
    startTransition(async () => {
      const result = await setBusinessSoloAction(target);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-center gap-3.5">
        <span className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-subtle text-muted">
          <TypeIcon size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{businessName}</span>
          <span className="text-[13px] text-muted">
            {isSolo ? "Solo business: you do your own sales and cash-ups" : "Team business: your staff do the sales"}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={change}
        disabled={pending || blocked}
        className="flex min-h-11 w-full items-center justify-center rounded-[10px] border border-line-strong bg-surface text-sm font-semibold text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:text-muted"
      >
        {pending ? "Saving…" : isSolo ? "Change to a team business" : "Change to a solo business"}
      </button>

      {blocked && (
        <p className="text-[13px] text-muted">
          Solo is only possible with no other active members. Deactivate them from Team first.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
