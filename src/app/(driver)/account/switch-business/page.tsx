import { Suspense } from "react";
import { SwitchBusinessForm } from "@/components/account/SwitchBusinessForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockAccount } from "@/lib/mock/account";
import { resolveOrigin } from "@/lib/navigation/origin";

type SwitchBusinessPageProps = {
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads where the driver came from. It lives inside Suspense because search params are runtime data. */
async function SwitchBusinessContent({ searchParams }: SwitchBusinessPageProps) {
    const { from } = await searchParams;
    return (
        <SwitchBusinessForm
            businesses={mockAccount.businesses}
            currentBusinessId={mockAccount.currentBusinessId}
            returnHref={resolveOrigin(from, "account").href}
        />
    );
}

export default function SwitchBusinessPage({ searchParams }: SwitchBusinessPageProps) {
    return (
        <div className="space-y-5">
            <PageHeader title="Switch business" subtitle="Choose where you work" />
            <Suspense fallback={<div aria-hidden className="mx-auto h-72 w-full max-w-140 animate-pulse rounded-xl bg-subtle" />}>
                <SwitchBusinessContent searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
