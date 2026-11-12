export type ServiceErrorCode = 'FORBIDDEN' | 'ACTOR_NOT_ACTIVE' | 'ENTITY_NOT_FOUND' | 'CONFLICT' | 'CASHUP_ALREADY_OPEN' |
 'CASHUP_STATE_CONFLICT' | 'CASHUP_NOT_EMPTY'| 'BUSINESS_RULE' | 'SALES_AWAITING_DELIVERY' | 'REQUESTS_AWAITING_DECISION' |
  'REVIEW_NOT_ALLOWED' | 'CASHUP_NOT_OPEN' | 'SALE_NOT_BALANCED' | 'SALE_REQUIRES_REFERENCE_RATE' |
  'SALE_NOT_AWAITING_DELIVERY' | 'SALE_ALREADY_CANCELLED' | 'SALE_ALREADY_DELIVERED' |
   'SALE_DELETION_REQUEST_EXISTS' | 'SALE_DELETION_REQUIRES_DELIVERED' | 'REQUEST_ALREADY_DECIDED' | 'SALE_DELETION_STATE_CONFLICT' | 'SALE_CANNOT_BE_CANCELLED' | 'CASHOUT_ALREADY_CANCELLED' | 'IDEMPOTENCY_REPLAY_UNVERIFIABLE' | 'IDEMPOTENCY_KEY_REUSED' |
    'BUSINESS_ALREADY_EXISTS' | 'MEMBER_CANNOT_DEACTIVATE_SELF' | 'MEMBER_DEACTIVATION_FORBIDDEN' | 'MEMBER_HAS_UNRESOLVED_CASHUPS' |
     'LAST_ACTIVE_OWNER' | 'MANAGER_NOT_FOUND' | 'MANAGER_INACTIVE' | 'OWNER_CANNOT_BE_MANAGER' | 'MANAGER_ALREADY_ASSIGNED' |
      'MANAGER_CHANGE_IN_SOLO_BUSINESS' | 'SOLO_CHANGE_BLOCKED' | 'JOIN_CODE_INVALID' | 'CASHUP_HAS_NO_SALES' | 'COUNT_REQUIRED' |
       'VOID_REASON_INVALID' | 'LEGACY_AMENDMENT_UNSUPPORTED' | 'AMENDMENT_FIELD_UNSUPPORTED';
export class ServiceError extends Error {
    constructor(public readonly code: ServiceErrorCode, message: string) {
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
export class UnauthenticatedError extends Error {
    constructor() {
        super('Authentication is required.');
        this.name = 'UnauthenticatedError';
    }
}
