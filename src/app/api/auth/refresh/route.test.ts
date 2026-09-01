import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/auth/errors';
import { authService } from '@/services/auth';
import { POST } from './route';

vi.mock('@/lib/auth/rate-limiter', () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  authService: { refresh: vi.fn() },
}));

const refreshMock = vi.mocked(authService.refresh);

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/refresh', () => {
  it('rotaciona e atualiza os dois cookies', async () => {
    refreshMock.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { id: 'user-1', name: 'Matheus', email: 'matheus@email.com' },
    });
    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: 'viue_refresh_token=old-refresh' },
    });

    const response = await POST(request);
    const cookies = response.headers.getSetCookie().join(';');

    expect(response.status).toBe(200);
    expect(refreshMock).toHaveBeenCalledWith('old-refresh');
    expect(cookies).toContain('viue_access_token=new-access');
    expect(cookies).toContain('viue_refresh_token=new-refresh');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('limpa os cookies quando o refresh token é inválido', async () => {
    refreshMock.mockRejectedValue(
      new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token inválido.', 401),
    );
    const request = new NextRequest('http://localhost/api/auth/refresh', { method: 'POST' });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().join(';')).toContain('Max-Age=0');
  });
});
