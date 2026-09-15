import { z } from 'zod';

export const emailSchema = z.email();

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72);

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  password: passwordSchema,
});

export const googleLoginSchema = z.object({
  /** The ID token (JWT) Google Identity Services hands to the browser. */
  credential: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
