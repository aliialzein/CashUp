import { z } from 'zod';

export const normalizedEmail = z.string().trim().max(254).email().transform(value => value.toLowerCase());
// Passwords are never trimmed or normalized; bound hashing work and accept existing local passwords.
export const loginSchema = z.object({ email: normalizedEmail, password: z.string().min(1).max(128) }).strict();
export const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(1).max(120).refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Invalid name'),
  password: z.string().min(8).max(128),
}).strict();
export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;

export const requestResetSchema = z.object({ email: normalizedEmail }).strict();
export const verifyResetSchema = requestResetSchema.extend({ code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.') }).strict();
export const resetPasswordSchema = z.object({
  password: signupSchema.shape.password,
  confirmPassword: z.string().max(128),
}).strict().refine(value => value.password === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
});
export type RequestResetInput = z.input<typeof requestResetSchema>;
export type VerifyResetInput = z.input<typeof verifyResetSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
