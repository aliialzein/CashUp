/**
 * The loading state for every driver page. Next.js wraps each page under (driver) in a <Suspense> with this
 * fallback, so a page that reads the session or the database at request time streams in behind it, and the
 * production build can still prerender the rest. The layout (top bar, tabs) is not wrapped and stays visible.
 * Same look as sales/[id]/complete/loading.tsx.
 */
export default function Loading() {
    return <p className="text-sm text-muted">Loading…</p>;
}
