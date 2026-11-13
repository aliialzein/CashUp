import Link from "next/link";
import {
  ArrowRight,
  UsersRound,
  WalletCards,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { routes } from "@/lib/routes";

export default function FirstDriverCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="grid gap-10 p-6 sm:gap-12 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-8 lg:p-10">
        {/* Main content */}
        <div className="relative z-10 space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-ink">
            <UsersRound size={28} strokeWidth={1.7} />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Let&apos;s get started
            </span>

            <h2 className="max-w-lg text-2xl font-bold leading-tight text-ink sm:text-3xl">
              Your business starts with your team.
            </h2>

            <p className="max-w-lg text-sm leading-7 text-muted sm:text-base">
              Invite your first driver to start managing deliveries, tracking
              cash-ups, and keeping everything organized in one place.
            </p>
          </div>

          <Link
            href={routes.owner.invite}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            <UserPlus size={18} />
            Invite your first driver
            <ArrowRight size={17} />
          </Link>
        </div>

        {/* Steps */}
        <div className="relative rounded-2xl border border-line bg-subtle p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={19} className="text-muted" />
            <h3 className="text-sm font-semibold text-ink">How it works</h3>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-bold text-ink">
                01
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  Generate an invite code
                </p>
                <p className="text-xs leading-5 text-muted">
                  Create a secure, one-time code for your driver.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-bold text-ink">
                02
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  Invite your driver
                </p>
                <p className="text-xs leading-5 text-muted">
                  Share the code so they can join your business.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-bold text-ink">
                03
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  Start tracking cash-ups
                </p>
                <p className="text-xs leading-5 text-muted">
                  Review your driver&apos;s cash-ups directly from your
                  dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
            <WalletCards size={17} className="text-muted" />
            <p className="text-xs text-muted">
              Everything in one place with CashUp.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
