import { z } from 'zod';

import { EmailSchema, PasswordSchema } from '@/schemas/auth';

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida.')
    .nullable()
    .optional(),
});

export const RequestEmailChangeSchema = z.object({
  newEmail: EmailSchema,
});

export const ConfirmEmailChangeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'O código deve possuir 6 dígitos.'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordSchema,
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type RequestEmailChangeInput = z.infer<typeof RequestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof ConfirmEmailChangeSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
