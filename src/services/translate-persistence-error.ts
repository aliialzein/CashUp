import {
  DuplicateError,
  NotFoundError,
  NotInTransactionError,
  StaleStateError,
} from '../persistence';
import { ConflictError, EntityNotFoundError } from './errors';

export function translatePersistenceError(error: unknown): unknown {
  if (error instanceof NotFoundError) return new EntityNotFoundError();
  if (error instanceof StaleStateError || error instanceof DuplicateError) {
    return new ConflictError();
  }
  if (error instanceof NotInTransactionError) return error;
  return error;
}
