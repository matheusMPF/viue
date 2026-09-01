import type { NextRequest } from 'next/server';

import { RATE_LIMITS, REFRESH_TOKEN_COOKIE } from '@/constants/auth';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';
import { AuthError } from '@/lib/auth/errors';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { authService } from '@/services/auth';

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, 'auth:refresh', RATE_LIMITS.refresh);
    const result = await authService.refresh(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
    const response = successResponse({ user: result.user });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = errorResponse(error);
    if (error instanceof AuthError && error.code !== 'RATE_LIMIT_EXCEEDED') {
      clearAuthCookies(response);
    }
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
