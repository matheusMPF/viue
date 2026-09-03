import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_TOKEN_COOKIE, RATE_LIMITS, REFRESH_TOKEN_COOKIE } from '@/constants/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { authService } from '@/services/auth';

async function hasValidAccessToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await verifyAccessToken(token);
    return true;
  } catch {
    return false;
  }
}

function withUpdatedCookie(cookieHeader: string | null, name: string, value: string): string {
  const pattern = new RegExp(`(^|; )${name}=[^;]*`);
  if (cookieHeader && pattern.test(cookieHeader)) {
    return cookieHeader.replace(pattern, `$1${name}=${value}`);
  }
  return cookieHeader ? `${cookieHeader}; ${name}=${value}` : `${name}=${value}`;
}

/**
 * Renova a sessão nos bastidores quando o access token expirou mas o refresh
 * token ainda é válido, para o usuário nunca ver a tela de "Restaurando sessão".
 *
 * Qualquer falha aqui (refresh token ausente/expirado, limite de tentativas,
 * corrida com outra renovação simultânea) é apenas ignorada: a requisição segue
 * como se este proxy não existisse, e a própria página decide se redireciona
 * para o login — exatamente o comportamento anterior a essa otimização.
 */
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (await hasValidAccessToken(accessToken)) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  try {
    await enforceRateLimit(request, 'auth:refresh', RATE_LIMITS.refresh);
    const result = await authService.refresh(refreshToken);

    const cookieHeader = request.headers.get('cookie');
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      'cookie',
      withUpdatedCookie(
        withUpdatedCookie(cookieHeader, ACCESS_TOKEN_COOKIE, result.accessToken),
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
      ),
    );

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
