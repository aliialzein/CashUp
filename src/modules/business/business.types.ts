import 'server-only';
import type { MembershipStatus } from '../../generated/prisma/enums';
export interface BusinessDto {
    readonly id: string;
    readonly name: string;
    readonly isSolo: boolean;
    readonly role: 'OWNER' | 'MANAGER' | 'STAFF';
}
export interface MemberDto {
    readonly id: string;
    readonly fullName: string;
    readonly role: 'OWNER' | 'MANAGER' | 'STAFF';
    readonly status: MembershipStatus;
    readonly joinedAt: string;
    readonly deactivatedAt: string | null;
}
export interface JoinCodeDto {
    readonly id: string;
    readonly status: 'active' | 'expired' | 'revoked' | 'used_up';
    readonly expiresAt: string;
    readonly maxUses: number;
    readonly usedCount: number;
    readonly createdAt: string;
}
