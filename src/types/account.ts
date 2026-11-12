import type { LanguageCode } from "@/lib/account/languages";

export type Business = {
    id: string;
    name: string;
    /** Display text, e.g. "Driver". */
    role: string;
};

export type Account = {
    fullName: string;
    email: string;
    language: LanguageCode;
    currentBusinessId: string;
    businesses: Business[];
};
