import 'server-only';
import type { AuditRepository } from './audit.repository';
import type { CurrentMember } from '../auth/auth.types';
import type { AuditRecord } from './audit.types';
export async function recordAudit(audit: AuditRepository, actor: CurrentMember, entry: AuditRecord): Promise<void> {
    await audit.append({
        actorUserId: actor.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ...(entry.metadata ? { metadata: entry.metadata } : {}),
    });
}
