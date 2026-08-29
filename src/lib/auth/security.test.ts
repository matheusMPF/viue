import { decodeJwt } from 'jose';
import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';

import { clearAuthCookies, setAuthCookies } from './cookies';
import { createAccessToken, verifyAccessToken } from './jwt';

const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret;
  else delete process.env.JWT_SECRET;
});

describe('segurança dos tokens web', () => {
  it('limita os dados próprios do JWT a sub, name e email', async () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    const token = await createAccessToken({
      id: 'user-1',
      name: 'Matheus',
      email: 'matheus@email.com',
    });
    const payload = decodeJwt(token);

    expect(payload).toMatchObject({
      sub: 'user-1',
      name: 'Matheus',
      email: 'matheus@email.com',
    });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('password_hash');
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('email_verified');
    await expect(verifyAccessToken(token)).resolves.toEqual({
      id: 'user-1',
      name: 'Matheus',
      email: 'matheus@email.com',
    });
  });

  it('configura e limpa cookies HttpOnly com os caminhos corretos', () => {
    const response = NextResponse.json({ success: true });
    setAuthCookies(response, 'access', 'refresh');
    const cookies = response.headers.getSetCookie().join(';');

    expect(cookies).toContain('viue_access_token=access');
    expect(cookies).toContain('viue_refresh_token=refresh');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('SameSite=lax');
    expect(cookies).toContain('Path=/api/auth');

    const logoutResponse = NextResponse.json({ success: true });
    clearAuthCookies(logoutResponse);
    expect(logoutResponse.headers.getSetCookie().join(';')).toContain('Max-Age=0');
  });
});
