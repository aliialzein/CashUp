import { z } from 'zod';
import { pageQuery, uuid } from '../../shared/validation/common';
export const AUDIT_ENTITY_TYPES = [
    'USER',
    'BUSINESS',
    'MEMBERSHIP',
    'JOIN_CODE',
    'CASH_UP',
    'SALE',
    'CASH_OUT',
    'COUNT_ENTRY',
    'REQUEST',
    'AMENDMENT',
] as const;
export const auditQuerySchema = pageQuery
    .extend({
    entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
    entityId: uuid.optional(),
})
    .strict();
export type AuditQueryInput = z.input<typeof auditQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
