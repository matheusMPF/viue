import { cookies } from 'next/headers';

import { ACCESS_TOKEN_COOKIE } from '@/constants/auth';
import type { PublicUser } from '@/types/auth';
import { PrismaAuthRepository } from '@/services/auth/prisma-auth.repository';
import { AuthError } from './errors';
import { verifyAccessToken } from './jwt';

const repository = new PrismaAuthRepository();

export async function getAuthenticatedUser(): Promise<PublicUser> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) throw new AuthError('UNAUTHORIZED', 'Autenticação necessária.', 401);

  const payload = await verifyAccessToken(token);
  const user = await repository.findUserById(payload.id);
  if (!user || !user.emailVerified || user.status !== 'ACTIVE') {
    throw new AuthError('UNAUTHORIZED', 'Sessão inválida.', 401);
  }
  return { id: user.id, name: user.name, email: user.email };
}
