import { createAccessToken } from '@/lib/auth/jwt';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { BrevoService } from '@/lib/brevo/brevo.service';
import { AuthService } from './auth.service';
import { PrismaAuthRepository } from './prisma-auth.repository';

export const authService = new AuthService({
  repository: new PrismaAuthRepository(),
  mailer: new BrevoService(),
  hashPassword,
  verifyPassword,
  createAccessToken,
});

export { AuthService } from './auth.service';
