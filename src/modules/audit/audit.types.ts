import type { Prisma } from '../../generated/prisma/client';
import type { AuditAction, AuditEntityType } from '../../generated/prisma/enums';
export type AuditMetadata = Readonly<Record<string, string | number | boolean | null | undefined>>;
export interface AuditRecord {
    readonly action: AuditAction;
    readonly entityType: AuditEntityType;
    readonly entityId: string;
    readonly metadata?: AuditMetadata;
}
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
