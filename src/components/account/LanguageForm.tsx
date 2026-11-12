"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LANGUAGES, type LanguageCode } from "@/lib/account/languages";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";

const OPTIONS = LANGUAGES.map((language) => ({
    value: language.code,
    title: language.nativeName,
    subtitle: language.name,
}));

export function LanguageForm({ current }: { current: LanguageCode }) {
    const router = useRouter();
    const [selected, setSelected] = useState(current);
    useResetOnHide(() => setSelected(current));

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // TODO: send { language: selected } to the API.
        router.push(routes.driver.account);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-140">
            {/* Phone: no outer box, each language is its own card. Desktop: everything sits in one white card. */}
            <div className="space-y-4 md:space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7">
                <div className="space-y-2">
                    <SectionLabel>Choose language</SectionLabel>
                    <ChoiceCards label="Language" options={OPTIONS} value={selected} onChange={setSelected} />
                </div>

                <FormActions
                    cancelHref={routes.driver.account}
                    submitLabel="Save"
                    submitDisabled={selected === current}
                    onCancel={() => setSelected(current)}
                    cancelOnPhone={false}
                />
            </div>
        </form>
    );
}
