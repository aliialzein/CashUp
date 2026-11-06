import type { MembershipRole } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';

export class MembershipRepository extends TenantRepository {
  /** The caller's active membership in the active business (checked on every request, NFR3). */
  findActiveByUser(userId: string) {
    return this.db.membership.findFirst({
      where: { businessId: this.businessId, userId, isActive: true },
    });
  }

  findById(id: string) {
    return this.db.membership.findFirst({
      where: { id, businessId: this.businessId },
    });
  }

  listByRole(role: MembershipRole, opts: { activeOnly?: boolean } = {}) {
    return this.db.membership.findMany({
      where: {
        businessId: this.businessId,
        role,
        ...(opts.activeOnly ? { isActive: true } : {}),
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
