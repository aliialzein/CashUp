import { Prisma } from '../../generated/prisma/client';
import { AuditAction, AuditEntityType, CashUpStatus, MembershipRole, MembershipStatus } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import { NotFoundError } from '../errors';
import { AuditRepository } from './audit.repository';

export class BusinessRepository extends TenantRepository {
  getBusiness() {
    return this.db.business.findUnique({ where: { id: this.businessId } });
  }

  findSettings(): Promise<{ id: string; name: string; isSolo: boolean } | null> {
    return this.db.business.findUnique({
      where: { id: this.businessId },
      select: { id: true, name: true, isSolo: true },
    });
  }

  async lockBusiness() {
    this.requireTransaction();
    const rows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "businesses"
      WHERE "id" = ${this.businessId}::uuid
      FOR UPDATE
    `);
    if (rows.length === 0) return null;
    return this.getBusiness();
  }

  async setBusinessSolo(isSolo: boolean, actorUserId: string) {
    this.requireTransaction();
    const business = await this.lockBusiness();
    if (!business) throw new NotFoundError('Business');

    const [otherActiveMemberCount, unresolvedCashUpCount] = await Promise.all([
      this.db.membership.count({
        where: {
          businessId: this.businessId,
          status: MembershipStatus.ACTIVE,
          role: { not: MembershipRole.OWNER },
        },
      }),
      this.db.cashUp.count({
        where: {
          businessId: this.businessId,
          status: { in: [CashUpStatus.OPEN, CashUpStatus.SUBMITTED] },
        },
      }),
    ]);

    const counts = { otherActiveMemberCount, unresolvedCashUpCount };
    if (business.isSolo === isSolo) {
      return { status: 'unchanged' as const, business, ...counts };
    }

    const updated = await this.db.business.updateMany({
      where: { id: this.businessId, isSolo: business.isSolo },
      data: { isSolo },
    });
    if (updated.count !== 1) return { status: 'stale' as const, business, ...counts };

    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.BUSINESS_SOLO_CHANGED,
      entityType: AuditEntityType.BUSINESS,
      entityId: this.businessId,
      metadata: { oldIsSolo: business.isSolo, newIsSolo: isSolo } satisfies Prisma.InputJsonObject,
    });
    const updatedBusiness = await this.getBusiness();
    if (!updatedBusiness) throw new NotFoundError('Business');
    return { status: 'updated' as const, business: updatedBusiness, ...counts };
  }
}
