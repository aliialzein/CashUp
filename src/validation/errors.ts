import type { z } from 'zod';
import { getStableIssueCode } from './common';

export interface ValidationError {
  code: 'VALIDATION_ERROR';
  issues: Array<{ path: string[]; code: string }>;
}

export function toValidationError(error: z.ZodError): ValidationError {
  return {
    code: 'VALIDATION_ERROR',
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String),
      code: getStableIssueCode(issue),
    })),
  };
}
