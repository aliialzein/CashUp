import { StartCashUpForm } from "@/components/driver/cash-up/StartCashUpForm";
import { PageHeader } from "@/components/driver/layout/PageHeader";
import { driverData } from "@/lib/driver/data/driverData";
import { routes } from "@/lib/routes";

export const metadata = { title: "Start cash-up · CashUp" };

/** Reads the session like Today does: the (driver) loading.tsx boundary covers this page. */
export default async function StartCashUpPage() {
    // BACKEND: the business name for the phone subtitle, and the float to suggest (none in real mode yet).
    const [identity, suggestion] = await Promise.all([driverData.getIdentity(), driverData.getFloatSuggestion()]);

    return (
        <div className="mx-auto w-full max-w-140 space-y-4 md:space-y-5">
            <PageHeader title="Start cash-up" phoneSubtitle={identity.businessName} close={{ href: routes.driver.today }} />
            <StartCashUpForm suggestion={suggestion} />
        </div>
    );
}
