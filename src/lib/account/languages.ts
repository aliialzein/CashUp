export const LANGUAGES = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "fr", name: "French", nativeName: "Français" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** The only language the app speaks today. Arabic and French come with translations. */
export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function languageName(code: LanguageCode): string {
    return LANGUAGES.find((language) => language.code === code)?.name ?? code;
}
