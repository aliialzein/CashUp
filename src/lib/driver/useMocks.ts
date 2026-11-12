/** The two environment variables the mock switch reads. */
type MockSwitchEnvironment = { USE_MOCKS?: string; NODE_ENV?: string };

/**
 * Real data by default. Mock data runs only when asked for on purpose (USE_MOCKS is exactly "1") and never in
 * production, even if USE_MOCKS is "1": `next build` and `next start` always run as production, so a build always
 * uses real data. Mock mode is a dev server only: `USE_MOCKS=1 npm run dev`.
 */
export function shouldUseMocks(environment: MockSwitchEnvironment): boolean {
    if (environment.NODE_ENV === "production") return false;
    return environment.USE_MOCKS === "1";
}

// Each variable is read by name, so Next.js can fill it in wherever this file is bundled.
export const USE_MOCKS = shouldUseMocks({ USE_MOCKS: process.env.USE_MOCKS, NODE_ENV: process.env.NODE_ENV });
