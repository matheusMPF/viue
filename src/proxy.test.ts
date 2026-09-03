import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/auth/errors';
import { authService } from '@/services/auth';
import { proxy } from './proxy';

vi.mock('@/lib/auth/rate-limiter', () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  authService: { refresh: vi.fn() },
}));

const refreshMock = vi.mocked(authService.refresh);
const originalJwtSecret = process.env.JWT_SECRET;

function requestWithCookies(cookie: string, extraHeaders: Record<string, string> = {}) {
  return new NextRequest('http://localhost/', { headers: { cookie, ...extraHeaders } });
}

afterEach(() => {
  vi.clearAllMocks();
  if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret;
  else delete process.env.JWT_SECRET;
});

describe('proxy', () => {
  it('deixa a requisição seguir sem tocar em cookies quando o access token já é válido', async () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    const { createAccessToken } = await import('@/lib/auth/jwt');
    const accessToken = await createAccessToken({
      id: 'user-1',
      name: 'Matheus',
      email: 'matheus@email.com',
    });

    const request = requestWithCookies(`viue_access_token=${accessToken}`);
    const response = await proxy(request);

    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('renova a sessão nos bastidores quando o access token expirou mas o refresh token é válido', async () => {
    refreshMock.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { id: 'user-1', name: 'Matheus', email: 'matheus@email.com' },
    });

    const request = requestWithCookies('viue_refresh_token=old-refresh');
    const response = await proxy(request);

    expect(refreshMock).toHaveBeenCalledWith('old-refresh');
    const cookies = response.headers.getSetCookie().join(';');
    expect(cookies).toContain('viue_access_token=new-access');
    expect(cookies).toContain('viue_refresh_token=new-refresh');

    // A própria página, ao renderizar nesta mesma requisição, precisa enxergar
    // o novo access token — não só o navegador na próxima requisição.
    const forwardedCookie = response.headers.get('x-middleware-request-cookie');
    expect(forwardedCookie).toContain('viue_access_token=new-access');
    expect(forwardedCookie).toContain('viue_refresh_token=new-refresh');
    expect(forwardedCookie).not.toContain('old-refresh');
  });

  it('segue sem mudanças quando não há refresh token', async () => {
    const request = new NextRequest('http://localhost/');
    const response = await proxy(request);

    expect(refreshMock).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it('segue sem mudanças quando o refresh token é inválido, sem limpar cookies', async () => {
    refreshMock.mockRejectedValue(
      new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token inválido.', 401),
    );

    const request = requestWithCookies('viue_refresh_token=expired');
    const response = await proxy(request);

    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
});
