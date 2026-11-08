import { z } from 'zod';
import { uuid } from '../../shared/validation/common';
const businessName = z
  .string()
  .refine((value) => !/[\u0000-\u001f\u007f-\u009f]/.test(value), {
    error: 'CONTROL_CHARACTER',
  })
  .transform((value) => value.trim())
  .refine((value) => value.length >= 1, { error: 'BUSINESS_NAME_REQUIRED' })
  .refine((value) => value.length <= 120, { error: 'BUSINESS_NAME_TOO_LONG' });
export const createBusinessSchema = z
  .object({
    name: businessName,
    isSolo: z.boolean().default(false),
  })
  .strict();
export const setBusinessSoloSchema = z.object({ isSolo: z.boolean() }).strict();
export const replaceManagerSchema = z.object({ memberId: uuid }).strict();
export const createJoinCodeSchema = z
  .object({
    maxUses: z.number().int().min(1).max(100).default(1),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();
export const redeemJoinCodeSchema = z
  .object({
    code: z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/, {
      error: 'INVALID_JOIN_CODE',
    }),
  })
  .strict();
export type CreateBusinessInput = z.input<typeof createBusinessSchema>;
export type CreateBusiness = z.infer<typeof createBusinessSchema>;
export type SetBusinessSoloInput = z.input<typeof setBusinessSoloSchema>;
export type SetBusinessSolo = z.infer<typeof setBusinessSoloSchema>;
export type CreateJoinCodeInput = z.input<typeof createJoinCodeSchema>;
export type CreateJoinCode = z.infer<typeof createJoinCodeSchema>;
export type RedeemJoinCodeInput = z.input<typeof redeemJoinCodeSchema>;
export type RedeemJoinCode = z.infer<typeof redeemJoinCodeSchema>;
export type ReplaceManagerInput = z.input<typeof replaceManagerSchema>;
export type ReplaceManager = z.infer<typeof replaceManagerSchema>;
