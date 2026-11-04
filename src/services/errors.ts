export type ServiceErrorCode =
  | 'FORBIDDEN'
  | 'ACTOR_NOT_ACTIVE'
  | 'ENTITY_NOT_FOUND'
  | 'CONFLICT'
  | 'CASHUP_ALREADY_OPEN'
  | 'CASHUP_STATE_CONFLICT'
  | 'BUSINESS_RULE'
  | 'SALES_AWAITING_DELIVERY'
  | 'REQUESTS_AWAITING_DECISION'
  | 'REVIEW_NOT_ALLOWED'
  | 'CASHUP_NOT_OPEN'
  | 'SALE_NOT_BALANCED'
  | 'SALE_NOT_AWAITING_DELIVERY'
  | 'SALE_ALREADY_CANCELLED'
  | 'SALE_CANNOT_BE_CANCELLED'
  | 'CASHOUT_ALREADY_CANCELLED'
  | 'IDEMPOTENCY_KEY_REUSED';

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ForbiddenError extends ServiceError {
  constructor(code: ServiceErrorCode = 'FORBIDDEN') {
    super(code, 'The actor is not permitted to perform this operation.');
  }
}

export class EntityNotFoundError extends ServiceError {
  constructor() {
    super('ENTITY_NOT_FOUND', 'The requested entity was not found.');
  }
}

export class ConflictError extends ServiceError {
  constructor(code: ServiceErrorCode = 'CONFLICT') {
    super(code, 'The requested operation conflicts with the current state.');
  }
}

export class BusinessRuleError extends ServiceError {
  constructor(code: ServiceErrorCode) {
    super(code, 'The requested operation is blocked by a business rule.');
  }
}
