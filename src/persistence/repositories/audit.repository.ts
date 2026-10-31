import type { Prisma } from '../../generated/prisma/client';
import type { AuditAction, AuditEntityType } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';

export interface AuditEntry {
  /** The User (not the membership) who acted. Null for system actions. */
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Old/new values, reasons, etc. Keep client numbers and other personal data out (NFR20). */
  metadata?: Prisma.InputJsonValue;
}

export interface AuditQuery {
  entityType?: AuditEntityType;
  entityId?: string;
  take?: number;
  cursorId?: string;
}

/**
 * Append-only (NFR5). This class exposes `append` and reads, and deliberately nothing
 * that updates or deletes. The database trigger in the migration enforces it too.
 */
export class AuditRepository extends TenantRepository {
  /** Call it in the SAME transaction as the change it records, so one cannot exist without the other. */
  append(entry: AuditEntry) {
    return this.db.auditLog.create({
      data: {
        businessId: this.businessId,
        actorId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
      },
    });
  }

  appendMany(entries: AuditEntry[]) {
    return this.db.auditLog.createMany({
      data: entries.map((entry) => ({
        businessId: this.businessId,
        actorId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
      })),
    });
  }

  /** FR25: who, when, what. Newest first, cursor-paged. */
  list(query: AuditQuery = {}) {
    return this.db.auditLog.findMany({
      where: {
        businessId: this.businessId,
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      include: { actor: { select: { id: true, fullName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.take ?? 50,
      ...(query.cursorId ? { cursor: { id: query.cursorId }, skip: 1 } : {}),
    });
  }
}
