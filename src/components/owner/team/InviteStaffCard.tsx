import { ButtonLink } from "@/components/ui/ButtonLink";
import { routes } from "@/lib/routes";

/** Shown on Team while nobody has joined yet. */
export default function InviteStaffCard() {
  return (
    <section className="rounded-2xl border-2 border-dashed border-line bg-surface px-5 py-10 text-center sm:px-10 sm:py-12">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-subtle text-muted">
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

      <h2 className="mt-5 text-xl font-bold text-ink sm:text-2xl">Invite your team</h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">
        Your drivers join with a one-time code. Their cash-ups will show up here for your review.
      </p>

      <div className="mx-auto mt-7 max-w-xl">
        <ButtonLink href={routes.owner.invite} className="w-full">
          Invite staff
        </ButtonLink>
      </div>
    </section>
  );
}
