import { createHash } from 'node:crypto';
import { z } from 'zod';

export const idempotencyHeaderSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,128}$/, { error: 'INVALID_IDEMPOTENCY_KEY' });

export type IdempotencyBeginResult =
  | { readonly state: 'new' }
  | {
      readonly state: 'replay';
      readonly status: number;
      readonly body: unknown;
      readonly headers: Record<string, string>;
    }
  | { readonly state: 'in_progress' }
  | { readonly state: 'mismatch' };

export interface IdempotencyStore {
  begin(scope: string, key: string, requestHash: string): Promise<IdempotencyBeginResult>;
  complete(
    scope: string,
    key: string,
    status: number,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void>;
  abandon(scope: string, key: string): Promise<void>;
}

type Entry =
  | { readonly requestHash: string; readonly state: 'in_progress' }
  | {
      readonly requestHash: string;
      readonly state: 'complete';
      readonly status: number;
      readonly body: unknown;
      readonly headers: Record<string, string>;
    };

/**
 * STUB: in-memory and per-process only; not safe for serverless or multi-instance deployment.
 * Replace with durable idempotency storage in a later task.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, Entry>();

  async begin(scope: string, key: string, requestHash: string): Promise<IdempotencyBeginResult> {
    const storageKey = `${scope}:${key}`;
    const existing = this.entries.get(storageKey);
    if (!existing) {
      this.entries.set(storageKey, { requestHash, state: 'in_progress' });
      return { state: 'new' };
    }
    if (existing.requestHash !== requestHash) return { state: 'mismatch' };
    if (existing.state === 'in_progress') return { state: 'in_progress' };
    return {
      state: 'replay',
      status: existing.status,
      body: existing.body,
      headers: { ...existing.headers },
    };
  }

  async complete(
    scope: string,
    key: string,
    status: number,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    const storageKey = `${scope}:${key}`;
    const existing = this.entries.get(storageKey);
    if (!existing || existing.state !== 'in_progress') {
      throw new Error('Cannot complete an idempotency key that is not in progress.');
    }
    this.entries.set(storageKey, {
      requestHash: existing.requestHash,
      state: 'complete',
      status,
      body,
      headers: { ...headers },
    });
  }

  async abandon(scope: string, key: string): Promise<void> {
    const storageKey = `${scope}:${key}`;
    const existing = this.entries.get(storageKey);
    if (existing?.state === 'in_progress') this.entries.delete(storageKey);
  }
}

export function hashCanonicalBody(body: unknown): string {
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
