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
