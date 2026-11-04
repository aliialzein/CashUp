"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LANGUAGES, type LanguageCode } from "@/lib/account/languages";
import { routes } from "@/lib/routes";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

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
            <Card className="space-y-5 p-7">
                <div className="space-y-2">
                    <SectionLabel>Choose language</SectionLabel>
                    <ChoiceCards label="Language" options={OPTIONS} value={selected} onChange={setSelected} />
                </div>

                <FormActions
                    cancelHref={routes.driver.account}
                    submitLabel="Save"
                    submitDisabled={selected === current}
                    onCancel={() => setSelected(current)}
                />
            </Card>
        </form>
    );
}
