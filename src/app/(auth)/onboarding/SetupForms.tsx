"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/driver/Button";
import { TextField } from "@/components/ui/driver/TextField";
import { FadeIn } from "@/components/ui/FadeIn";
import { businessNameError, joinCodeError, toJoinCode } from "@/lib/auth/onboardingInput";
import { createBusinessAction, joinBusinessAction } from "./actions";

type Mode = "create" | "join";

/** What both onboarding actions return: where to go next, or why it failed. */
type SetupResult = { destination?: string; message?: string };

/**
 * The red message.
 * autoHide: a reminder for an empty field, hidden after a few seconds. Server errors stay.
 * fading: the reminder is fading out and is removed right after.
 */
type FormError = { text: string; autoHide: boolean; fading?: boolean } | null;

const TABS: { mode: Mode; label: string }[] = [
	{ mode: "create", label: "Create a business" },
	{ mode: "join", label: "Join a business" },
];

const FALLBACK_ERROR = "Something went wrong. Please try again.";

/** How long an empty-field reminder stays fully visible. */
const HIDE_REMINDER_AFTER_MS = 3000;

/** The fade in and out of the red message (same as the green success line). */
const FADE_MS = 300;

/** The join code is shown in the mono font with wider letters, so 0/O and 1/I are easy to tell apart. */
const JOIN_CODE_STYLE = { fontFamily: "var(--font-jetbrains), ui-monospace, monospace", letterSpacing: "0.08em" };

/**
 * Where the white pill sits. Each tab is half the track minus the padding and the gap,
 * so moving to the second tab means moving one tab width plus the gap (0.25rem).
 */
const PILL_POSITION: Record<Mode, string> = {
	create: "translate-x-0",
	join: "translate-x-[calc(100%+0.25rem)]",
};

/** The red line above the button. Fades and slides in when it appears, fades out when it is hiding. */
function ErrorLine({ error }: { error: NonNullable<FormError> }) {
	return (
		<p
			role="alert"
			style={{ transitionDuration: `${FADE_MS}ms` }}
			className={`text-sm font-medium text-danger transition ease-out motion-reduce:transition-none starting:-translate-y-1 starting:opacity-0 ${error.fading ? "opacity-0" : "opacity-100"
				}`}
		>
			{error.text}
		</p>
	);
}

export default function SetupForms() {
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("create");
	const [name, setName] = useState("");
	const [isSolo, setIsSolo] = useState(false);
	const [code, setCode] = useState("");
	const [error, setError] = useState<FormError>(null);
	const [pending, setPending] = useState(false);

	// A reminder: after a few seconds it starts fading, then it is removed.
	// A new error or leaving the page cancels the timer.
	useEffect(() => {
		if (!error?.autoHide) return;
		const delay = error.fading ? FADE_MS : HIDE_REMINDER_AFTER_MS;
		const timer = setTimeout(() => setError(error.fading ? null : { ...error, fading: true }), delay);
		return () => clearTimeout(timer);
	}, [error]);

	/** The field is red only while the message is fully shown. */
	const fieldInvalid = error !== null && !error.fading;

	function pickMode(next: Mode) {
		if (next === mode) return;
		setMode(next);
		setError(null);
	}

	/** Calls one server action. On success it leaves the button loading while the next page opens. */
	async function run(action: () => Promise<SetupResult>) {
		if (pending) return;
		setPending(true);
		setError(null);
		try {
			const result = await action();
			if (result.destination) {
				router.replace(result.destination);
				router.refresh();
				return;
			}
			setError({ text: result.message ?? FALLBACK_ERROR, autoHide: false });
		} catch {
			setError({ text: FALLBACK_ERROR, autoHide: false });
		}
		setPending(false);
	}

	function submitCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const problem = businessNameError(name);
		if (problem) {
			setError({ text: problem, autoHide: true });
			return;
		}
		const form = new FormData();
		form.set("name", name);
		if (isSolo) form.set("isSolo", "on");
		void run(() => createBusinessAction(form));
	}

	function submitJoin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const problem = joinCodeError(code);
		if (problem) {
			setError({ text: problem, autoHide: true });
			return;
		}
		const form = new FormData();
		form.set("code", code);
		void run(() => joinBusinessAction(form));
	}

	return (
		<div className="flex flex-col gap-5">
			<div role="group" aria-label="How do you start?" className="relative grid grid-cols-2 gap-1 rounded-xl bg-line p-1">
				<span
					aria-hidden="true"
					className={`absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-[9px] bg-surface shadow-sm transition-transform duration-500 ease-in-out motion-reduce:transition-none ${PILL_POSITION[mode]}`}
				/>
				{TABS.map((tab) => {
					const active = tab.mode === mode;
					return (
						<button
							key={tab.mode}
							type="button"
							aria-pressed={active}
							onClick={() => pickMode(tab.mode)}
							className={`relative min-h-11 rounded-[9px] text-sm transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-ink ${active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink"
								}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			<FadeIn key={mode}>
				{mode === "create" ? (
					<form onSubmit={submitCreate} noValidate className="flex flex-col gap-5">
						<TextField
							label="Business name"
							value={name}
							onChange={(event) => {
								setName(event.target.value);
								setError(null);
							}}
							maxLength={120}
							placeholder="Ali's Deliveries"
							autoComplete="organization"
							invalid={fieldInvalid}
						/>

						<label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-medium text-ink">
							<input
								type="checkbox"
								checked={isSolo}
								onChange={(event) => setIsSolo(event.target.checked)}
								className="peer sr-only"
							/>
							<span
								aria-hidden="true"
								className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-white transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${isSolo ? "border-ink bg-ink" : "border-muted bg-surface"
									}`}
							>
								{isSolo && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
										<path d="m5 12 5 5 9-10" />
									</svg>
								)}
							</span>
							I work on my own
						</label>

						{error && <ErrorLine error={error} />}

						<Button type="submit" loading={pending}>Create business</Button>
					</form>
				) : (
					<form onSubmit={submitJoin} noValidate className="flex flex-col gap-5">
						<TextField
							label="Join code"
							value={code}
							onChange={(event) => {
								setCode(toJoinCode(event.target.value));
								setError(null);
							}}
							placeholder="Code from your owner"
							autoComplete="off"
							autoCapitalize="characters"
							spellCheck={false}
							invalid={fieldInvalid}
							style={JOIN_CODE_STYLE}
						/>

						{error && <ErrorLine error={error} />}

						<Button type="submit" loading={pending}>Join business</Button>
					</form>
				)}
			</FadeIn>
		</div>
	);
}
