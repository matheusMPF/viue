import { z } from 'zod';

import { normalizeEmail } from '@/utils/normalize-email';

const EmailSchema = z.string().trim().email('Informe um e-mail válido.').transform(normalizeEmail);

const PasswordSchema = z.string().min(8, 'A senha deve possuir pelo menos 8 caracteres.');

export const OtpPurposeSchema = z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']);

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

export const VerifyOtpSchema = z.object({
  email: EmailSchema,
  code: z.string().regex(/^\d{6}$/, 'O código deve possuir 6 dígitos.'),
  purpose: OtpPurposeSchema,
});

export const ResendOtpSchema = z.object({
  email: EmailSchema,
  purpose: OtpPurposeSchema,
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  password: PasswordSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
