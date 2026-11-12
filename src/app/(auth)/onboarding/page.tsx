import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, authDestination } from "@/modules/auth/auth.service";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import type { AuthBrand } from "@/components/auth/AuthBrandPanel";
import LogoutButton from "@/components/auth/LogoutButton";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FadeIn } from "@/components/ui/FadeIn";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import SetupForms from "./SetupForms";

const ONBOARDING_BRAND: AuthBrand = {
	title: "One last step before your first cash-up.",
	features: ["Owners create the business", "Drivers join with the owner's code"],
};

/** A small centred card for a state that needs no form. */
function NoticeCard({ title, text, icon, children }: { title: string; text: string; icon?: ReactNode; children?: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-3.5 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm sm:p-8">
			{icon && (
				<span className="flex h-13 w-13 items-center justify-center rounded-full bg-subtle text-muted">{icon}</span>
			)}
			<h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
			<p className="text-[15px] leading-6 text-muted">{text}</p>
			{children}
		</div>
	);
}

async function Content() {
	const user = await getCurrentUser();
	if (!user) redirect(routes.login);
	if (authDestination(user) === "/owner") redirect("/owner");

	return (
		<AuthLayout brand={ONBOARDING_BRAND}>
			<FadeIn>
				{!user.membership ? (
					<AuthCard title="Set up your account" description={`Welcome, ${user.fullName}. Create your business or join one.`}>
						<SetupForms />
					</AuthCard>
				) : user.membership.status === "INACTIVE" ? (
					<NoticeCard
						title="Your account is inactive"
						text="Your access to this business was turned off. Contact your business owner to get back in."
						icon={<Icon name="lock" size={24} />}
					/>
				) : (
					// Goes away once authDestination sends STAFF straight to Today.
					<NoticeCard title="You're in" text="You joined your business. Open Today to start your first cash-up.">
						<ButtonLink href={routes.driver.today} className="mt-2">
							Go to Today
						</ButtonLink>
					</NoticeCard>
				)}
			</FadeIn>

			<div className="mt-4 flex justify-center">
				<LogoutButton />
			</div>
		</AuthLayout>
	);
}

export default function OnboardingPage() {
	return (
		<Suspense fallback={<p className="p-8 text-sm text-muted">Loading your account…</p>}>
			<Content />
		</Suspense>
	);
}
