"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { createJoinCodeAction } from "@/app/(owner)/owner/actions";
import { Button, buttonVariantClasses } from "@/components/ui/driver/Button";
import { ownerDate } from "../owner-format";

/** "AB2CDE3FGHJ4" shown as "AB2C DE3F GHJ4", easier to read aloud. The copy is always the plain code. */
function groupCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}

const COPIED_FOR_MS = 2000;

export default function InviteCodeCard() {
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createCode() {
    if (pending) return;
    setPending(true);
    setError("");
    const result = await createJoinCodeAction();
    if (result.ok) setInvite({ code: result.code, expiresAt: result.expiresAt });
    else setError(result.message);
    setPending(false);
  }

  async function copyCode() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FOR_MS);
    } catch {
      setError("Copy did not work. Select the code and copy it by hand.");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      {invite ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Join code</p>
            <p className="mt-1 select-all font-mono text-2xl font-bold tracking-widest text-ink">{groupCode(invite.code)}</p>
            <p className="mt-1 text-xs text-muted">One use · Expires {ownerDate(invite.expiresAt)}</p>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${buttonVariantClasses("primary")}`}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Create a code, then send it to your driver. Each code works once and expires after 7 days.</p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <Button type="button" variant={invite ? "secondary" : "primary"} loading={pending} onClick={createCode}>
        {invite ? "Create another code" : "Create a code"}
      </Button>
    </div>
  );
}
