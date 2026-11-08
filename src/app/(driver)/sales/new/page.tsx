import { Suspense } from "react";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { AddSaleForm } from "@/components/driver/sales/AddSaleForm";
import { requireOpenCashUp } from "@/lib/driver/data/requireOpenCashUp";
import { resolveOrigin } from "@/lib/navigation/origin";

type AddSalePageProps = {
	searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads where the driver came from and the open cash-up. It lives inside Suspense because both are runtime data. */
async function AddSaleContent({ searchParams }: AddSalePageProps) {
	// BACKEND: the open cash-up, for its number. With none open, the driver goes to Today.
	const [{ from }, cashUp] = await Promise.all([searchParams, requireOpenCashUp()]);
	const origin = resolveOrigin(from, "sales");

	return (
		<>
			<PageHeader title="Add sale" subtitle={`Cash-up #${cashUp.number}`} close={{ href: origin.href }} />
			<AddSaleForm returnHref={origin.href} />
		</>
	);
}

/** Shown until the origin and the cash-up are known: the same title bar, pointing to Sales. The number is not known yet. */
function AddSaleFallback() {
	return (
		<>
			<PageHeader title="Add sale" close={{ href: resolveOrigin(undefined, "sales").href }} />
			<div aria-hidden className="mx-auto h-96 w-full max-w-[640px] animate-pulse rounded-xl bg-subtle" />
		</>
	);
}

export default function AddSalePage({ searchParams }: AddSalePageProps) {
	return (
		<div className="space-y-5">
			<Suspense fallback={<AddSaleFallback />}>
				<AddSaleContent searchParams={searchParams} />
			</Suspense>
		</div>
	);
}
