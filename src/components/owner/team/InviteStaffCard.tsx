import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export default function InviteStaffCard() {
  const router = useRouter();

  return (
    <section className="rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-white px-5 py-10 text-center sm:px-10 sm:py-12">
      {/* Icon */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-9 w-9"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M19 8v6" />
          <path d="M22 11h-6" />
        </svg>
      </div>

      {/* Content */}
      <h2 className="mt-5 text-xl font-bold text-[#0f172a] sm:text-2xl">
        Invite your team
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#475569] sm:text-base">
        Your drivers and cashiers join with a one-time code. Their cash-ups will
        show up here for your review.
      </p>

      {/* Action */}
      <div className="mx-auto mt-7 max-w-xl">
        <Button
          fullWidth
          onClick={() => router.push("/owner/team/invite")}
          className="h-14 rounded-2xl bg-[#0f172a] text-base text-white shadow-none hover:bg-[#1e293b] focus-visible:ring-[#0f172a]/30"
        >
          Invite staff
        </Button>
      </div>
    </section>
  );
}
