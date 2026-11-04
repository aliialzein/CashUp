import { TenantRepository } from '../base.repository';

export class BusinessRepository extends TenantRepository {
  findSettings(): Promise<{ id: string; name: string; isSolo: boolean } | null> {
    return this.db.business.findUnique({
      where: { id: this.businessId },
      select: { id: true, name: true, isSolo: true },
    });
  }
}
