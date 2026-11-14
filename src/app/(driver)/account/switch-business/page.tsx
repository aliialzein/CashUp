import { Suspense } from "react";
import { ComingSoonNotice } from "@/components/account/ComingSoonNotice";
import { SwitchBusinessForm } from "@/components/account/SwitchBusinessForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { driverData } from "@/lib/driver/data/driverData";
import { resolveOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";

const TITLE = "Switch business";
const SUBTITLE = "Choose where you work";

type SwitchBusinessPageProps = {
    searchParams: Promise<{ from?: string | string[] }>;
};

/** Reads where the driver came from and their business. Both are runtime data, so this lives inside Suspense. */
async function SwitchBusinessContent({ searchParams }: SwitchBusinessPageProps) {
    const [{ from }, identity] = await Promise.all([searchParams, driverData.getIdentity()]);
    const origin = resolveOrigin(from, "account");
    return (
        <>
            <PageHeader title={TITLE} subtitle={SUBTITLE} phoneBack={origin} />
            <ComingSoonNotice>
                Your account belongs to one business. Working with several businesses is coming later.
            </ComingSoonNotice>
            {/* Disabled while a member can belong to only one business (one membership per user). */}
            <SwitchBusinessForm
                businesses={[{ id: identity.businessId, name: identity.businessName, role: identity.roleLabel }]}
                currentBusinessId={identity.businessId}
                returnHref={origin.href}
                disabled
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
