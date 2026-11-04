"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import type { Business } from "@/types/account";

type SwitchBusinessFormProps = {
    businesses: Business[];
    currentBusinessId: string;
    /** Where Cancel and Switch go: the page the driver came from. */
    returnHref: string;
};

export function SwitchBusinessForm({ businesses, currentBusinessId, returnHref }: SwitchBusinessFormProps) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState(currentBusinessId);
    useResetOnHide(() => setSelectedId(currentBusinessId));

    const options = businesses.map((business) => ({
        value: business.id,
        title: business.name,
        subtitle: business.id === currentBusinessId ? `Current · ${business.role}` : business.role,
    }));

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // TODO: send { businessId: selectedId } to the API.
        router.push(returnHref);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-140">
            <Card className="space-y-5 p-7">
                <div className="space-y-2">
                    <SectionLabel>Your businesses</SectionLabel>
                    <ChoiceCards label="Your businesses" options={options} value={selectedId} onChange={setSelectedId} />
                </div>

                <p className="text-sm leading-relaxed text-muted">
                    Each business keeps its own cash-ups and team. Switching does not delete anything.
                </p>

                <FormActions
                    cancelHref={returnHref}
                    submitLabel="Switch"
                    submitDisabled={selectedId === currentBusinessId}
                    onCancel={() => setSelectedId(currentBusinessId)}
                />
            </Card>
        </form>
    );
}
