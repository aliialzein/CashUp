import { AsyncLocalStorage } from 'node:async_hooks';
import type { cookies } from 'next/headers';
export type SessionCookieJar = Awaited<ReturnType<typeof cookies>>;
const cookieScope = new AsyncLocalStorage<SessionCookieJar>();
export function withSessionCookies<T>(jar: SessionCookieJar, work: () => T): T { return cookieScope.run(jar, work); }
export function currentSessionCookies(): SessionCookieJar {
  const jar = cookieScope.getStore();
  if (!jar) throw new Error('A session cookie fixture is required for this test');
  return jar;
}
export function sessionCookieJar() {
  const values = new Map<string, string>();
  const writes: Array<{ name: string; value: string; options: unknown }> = [];
  const jar = {
    get(name: string) { return values.has(name) ? { name, value: values.get(name)! } : undefined; },
    set(name: string, value: string, options?: unknown) { values.set(name, value); writes.push({ name, value, options }); },
  };
  return { values, writes, jar: jar as unknown as SessionCookieJar };
}
