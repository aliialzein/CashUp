import { Suspense } from "react";
import { SwitchBusinessForm } from "@/components/account/SwitchBusinessForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockAccount } from "@/lib/mock/account";
import { resolveOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

const TITLE = "Switch business";
const SUBTITLE = "Choose where you work";

type SwitchBusinessPageProps = {
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads where the driver came from. It lives inside Suspense because search params are runtime data. */
async function SwitchBusinessContent({ searchParams }: SwitchBusinessPageProps) {
    const { from } = await searchParams;
    const origin = resolveOrigin(from, "account");
    return (
        <>
            <PageHeader title={TITLE} subtitle={SUBTITLE} phoneBack={origin} />
            <SwitchBusinessForm
                businesses={mockAccount.businesses}
                currentBusinessId={mockAccount.currentBusinessId}
                returnHref={origin.href}
            />
        </>
    );
}

function SwitchBusinessFallback() {
    return (
        <>
            <PageHeader title={TITLE} subtitle={SUBTITLE} phoneBack={{ href: routes.driver.account, label: "Account" }} />
            <div aria-hidden className="mx-auto h-72 w-full max-w-140 animate-pulse rounded-xl bg-subtle" />
        </>
    );
}

export default function SwitchBusinessPage({ searchParams }: SwitchBusinessPageProps) {
    return (
        <div className="space-y-5">
            <Suspense fallback={<SwitchBusinessFallback />}>
                <SwitchBusinessContent searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
