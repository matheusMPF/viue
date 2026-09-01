import { jwtVerify, SignJWT } from 'jose';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ACCESS_AUDIENCE,
  JWT_ALGORITHM,
  JWT_ISSUER,
} from '@/constants/auth';
import type { AccessTokenPayload } from '@/types/auth';
import { AuthError } from './errors';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(payload.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_ACCESS_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_ACCESS_AUDIENCE,
    });
    if (!payload.sub || typeof payload.name !== 'string' || typeof payload.email !== 'string') {
      throw new AuthError('UNAUTHORIZED', 'Sessão inválida.', 401);
    }
    return { id: payload.sub, name: payload.name, email: payload.email };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('UNAUTHORIZED', 'Sessão inválida ou expirada.', 401);
  }
}
