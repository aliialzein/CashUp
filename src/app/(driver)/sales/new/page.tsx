import { Suspense } from "react";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { AddSaleForm } from "@/components/driver/sales/AddSaleForm";
import { mockOpenCashUp } from "@/lib/driver/mock/cash-up";
import { resolveOrigin } from "@/lib/navigation/origin";

type AddSalePageProps = {
	searchParams: Promise<{ from?: string | string[] }>;
};

const SUBTITLE = `Cash-up #${mockOpenCashUp.number}`;

/** Reads where the driver came from. It lives inside Suspense because search params are runtime data. */
async function AddSaleContent({ searchParams }: AddSalePageProps) {
	const { from } = await searchParams;
	const origin = resolveOrigin(from, "sales");

	return (
		<>
			<PageHeader title="Add sale" subtitle={SUBTITLE} close={{ href: origin.href }} />
			<AddSaleForm returnHref={origin.href} />
		</>
	);
}

/** Shown until the origin is known: the same title bar, pointing to Sales, so nothing jumps. */
function AddSaleFallback() {
	return (
		<>
			<PageHeader title="Add sale" subtitle={SUBTITLE} close={{ href: resolveOrigin(undefined, "sales").href }} />
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
