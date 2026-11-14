"use client";

import { useState, type FormEvent } from "react";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

/** A business the member belongs to, as this form shows it. */
export type Business = {
    id: string;
    name: string;
    /** Display text, e.g. "Driver". */
    role: string;
};

type SwitchBusinessFormProps = {
    businesses: Business[];
    currentBusinessId: string;
    /** Where Cancel goes: the page the driver came from. */
    returnHref: string;
    /** True while a member can belong to only one business: the list is shown but cannot be used. */
    disabled?: boolean;
};

export function SwitchBusinessForm({ businesses, currentBusinessId, returnHref, disabled = false }: SwitchBusinessFormProps) {
    const [selectedId, setSelectedId] = useState(currentBusinessId);
    useResetOnHide(() => setSelectedId(currentBusinessId));

    const options = businesses.map((business) => ({
        value: business.id,
        title: business.name,
        subtitle: business.id === currentBusinessId ? `Current · ${business.role}` : business.role,
    }));

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // Nothing is sent until a member can belong to several businesses (today one membership per user).
        if (disabled) return;
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-140">
            {/* Phone: no outer box, each business is its own card. Desktop: everything sits in one white card. */}
            <fieldset
                disabled={disabled}
                className="min-w-0 space-y-4 md:space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7"
            >
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
                    submitDisabled={disabled || selectedId === currentBusinessId}
                    onCancel={() => setSelectedId(currentBusinessId)}
                    cancelOnPhone={false}
                />
            </fieldset>
        </form>
    );
}
