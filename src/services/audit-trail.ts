import type { AuditAction, AuditEntityType } from '../persistence';
import type { Actor } from './actor';
import type { TransactionRepositories } from './ports';

export type AuditMetadata = Readonly<Record<string, string | number | boolean | null | undefined>>;

export interface AuditRecord {
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly metadata?: AuditMetadata;
}

export class AuditTrail {
  async record(
    repos: TransactionRepositories,
    actor: Actor,
    entry: AuditRecord,
  ): Promise<void> {
    await repos.audit.append({
      actorUserId: actor.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    });
  }
}
