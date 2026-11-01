import { Prisma } from '../generated/prisma/client';

/** Base class so services can catch every persistence-level failure in one place. */
export class PersistenceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The row does not exist in the active business (or is not visible to this caller). */
export class NotFoundError extends PersistenceError {
  constructor(what: string) {
    super('NOT_FOUND', `${what} not found`);
  }
}

/** A row lock was requested from repositories not backed by a UnitOfWork transaction. */
export class NotInTransactionError extends PersistenceError {
  constructor() {
    super('NOT_IN_TRANSACTION', 'This operation requires a UnitOfWork transaction');
  }
}

/**
 * A guarded write matched no row: the record was no longer in the expected state
 * (NFR16 — "a status change succeeds only if the record is still in the expected status").
 */
export class StaleStateError extends PersistenceError {
  constructor(what: string) {
    super('STALE_STATE', `${what} is no longer in the expected state`);
  }
}

/** A unique constraint (including the partial indexes in the migration) was violated. */
export class DuplicateError extends PersistenceError {
  constructor(what: string) {
    super('DUPLICATE', `${what} already exists`);
  }
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export function isRecordNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025';
}
