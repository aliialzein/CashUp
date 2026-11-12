/** A blank note is no note, so the backend stores null instead of an empty text. Otherwise the trimmed note. */
export function toNote(note: string): string | null {
    const trimmedNote = note.trim();
    return trimmedNote === "" ? null : trimmedNote;
}
