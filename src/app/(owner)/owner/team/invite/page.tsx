"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";

export default function InviteStaffPage() {
  const [copied, setCopied] = useState(false);
  const inviteCode = "CASHUP-8492-XQ";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = inviteCode;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-6 bg-[#f8fafc] min-h-screen text-[#0f172a]">
      <div>
        <Link
          href="/owner/team"
          className="text-sm font-medium text-[#475569] hover:text-[#0f172a]"
        >
          ← Back to Team
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[#0f172a] sm:text-3xl">
          Invite Staff
        </h1>

        <p className="mt-2 text-sm text-[#475569]">
          Generate a one-time invitation code for your staff.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]">
            <div>
              <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Invitation Code
              </p>
              <p className="mt-1 text-xl font-mono font-bold text-[#0f172a]">
                {inviteCode}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e293b]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#a7f3d0]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs font-medium text-[#475569]">
            Note: This code expires in 48 hours.
          </p>
        </div>

        <p className="text-sm text-[#475569] px-1">
          Send this code to your staff member, they can use this code to join
          your business.
        </p>
      </div>
    </div>
  );
}
