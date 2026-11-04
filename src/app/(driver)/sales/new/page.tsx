import { Suspense } from "react";
import { AddSaleForm } from "@/components/sales/AddSaleForm";
import { mockOpenCashUp } from "@/lib/mock/cash-up";
import { resolveOrigin } from "@/lib/navigation/origin";

type AddSalePageProps = {
	searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads where the driver came from. It lives inside Suspense because search params are runtime data. */
async function AddSaleContent({ searchParams }: AddSalePageProps) {
	const { from } = await searchParams;
	return <AddSaleForm returnHref={resolveOrigin(from, "sales").href} />;
}

export default function AddSalePage({ searchParams }: AddSalePageProps) {
	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-heading text-2xl font-bold tracking-tight">Add sale</h1>
				<p className="mt-1 text-sm text-muted">Cash-up #{mockOpenCashUp.number}</p>
			</div>

			<Suspense fallback={<div aria-hidden className="mx-auto h-96 w-full max-w-[640px] animate-pulse rounded-xl bg-subtle" />}>
				<AddSaleContent searchParams={searchParams} />
			</Suspense>
		</div>
	);
}
