import { PageSkeleton } from "@/components/driver/layout/PageSkeleton";

/**
 * The loading state for every driver page: Next.js wraps the page in a <Suspense> with this fallback, so a page that
 * reads the session or the database streams in behind it. The layout (top bar, tabs) is not wrapped and stays visible.
 *
 * Every page folder under (driver) re-exports this file as its own loading.tsx. One file here is not enough: on a
 * client navigation (Today to History) only the part below the shared layout re-renders, and a boundary at this level
 * sits above it, so Next.js reports the navigation as blocking ("uncached data … outside of <Suspense>").
 */
export default function Loading() {
    return <PageSkeleton />;
}
