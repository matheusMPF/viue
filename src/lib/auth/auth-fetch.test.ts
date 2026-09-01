import { afterEach, describe, expect, it, vi } from 'vitest';

import { authFetch } from './auth-fetch';

const unauthorized = () =>
  Response.json(
    { success: false, code: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.' },
    { status: 401 },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authFetch', () => {
  it('retorna a primeira resposta quando não há erro de autenticação', async () => {
    const fetchMock = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('http://localhost/api/private');

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renova a sessão e repete a requisição original uma única vez', async () => {
    const protectedBodies: string[] = [];
    let protectedCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith('/api/auth/refresh')) {
        return Response.json({ success: true });
      }
      protectedCalls += 1;
      protectedBodies.push(await request.text());
      return protectedCalls === 1 ? unauthorized() : Response.json({ success: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('http://localhost/api/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleId: 'movie-1' }),
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(protectedBodies).toEqual([
      JSON.stringify({ titleId: 'movie-1' }),
      JSON.stringify({ titleId: 'movie-1' }),
    ]);
  });

  it('não tenta renovar erros 401 que não são do access token', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { success: false, code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' },
        { status: 401 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('http://localhost/api/auth/login');

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('expira a sessão quando o refresh token também é inválido', async () => {
    const onSessionExpired = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      return request.url.endsWith('/api/auth/refresh')
        ? Response.json({ success: false, code: 'INVALID_REFRESH_TOKEN' }, { status: 401 })
        : unauthorized();
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('http://localhost/api/private', undefined, {
      onSessionExpired,
    });

    expect(response.status).toBe(401);
    expect(onSessionExpired).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('não encerra a sessão por uma falha temporária no endpoint de refresh', async () => {
    const onSessionExpired = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      return request.url.endsWith('/api/auth/refresh')
        ? Response.json({ success: false, code: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
        : unauthorized();
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('http://localhost/api/private', undefined, {
      onSessionExpired,
    });

    expect(response.status).toBe(401);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('compartilha uma única renovação entre requisições simultâneas', async () => {
    let finishRefresh: ((response: Response) => void) | undefined;
    const refreshResponse = new Promise<Response>((resolve) => {
      finishRefresh = resolve;
    });
    const protectedCalls = new Map<string, number>();
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1;
        return refreshResponse;
      }
      const calls = (protectedCalls.get(request.url) ?? 0) + 1;
      protectedCalls.set(request.url, calls);
      return calls === 1 ? unauthorized() : Response.json({ success: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const requests = Promise.all([
      authFetch('http://localhost/api/private/one'),
      authFetch('http://localhost/api/private/two'),
    ]);
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    finishRefresh?.(Response.json({ success: true }));

    const responses = await requests;
    expect(responses.every((response) => response.ok)).toBe(true);
    expect(refreshCalls).toBe(1);
  });
});
