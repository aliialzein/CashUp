import { RequestStatus } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';

export class RequestRepository extends TenantRepository {
  countAwaitingByCashUp(cashUpId: string): Promise<number> {
    return this.db.request.count({
      where: {
        cashUpId,
        businessId: this.businessId,
        status: RequestStatus.AWAITING_OWNER,
      },
    });
  }
}
