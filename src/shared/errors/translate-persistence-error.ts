import { DuplicateError, NotFoundError, StaleStateError } from './persistence-errors';
import { ConflictError, EntityNotFoundError } from './service-errors';
export function translatePersistenceError(error: unknown): unknown {
  if (error instanceof NotFoundError)
    return new EntityNotFoundError();
  if (error instanceof StaleStateError || error instanceof DuplicateError) {
    return new ConflictError();
  }
  return error;
}
