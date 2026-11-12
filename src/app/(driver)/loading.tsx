import { PageSkeleton } from "@/components/driver/layout/PageSkeleton";

/**
 * The loading state for every driver page. Next.js wraps each page under (driver) in a <Suspense> with this
 * fallback, so a page that reads the session or the database at request time streams in behind it, and the
 * production build can still prerender the rest. The layout (top bar, tabs) is not wrapped and stays visible.
 */
export default function Loading() {
    return <PageSkeleton />;
}
