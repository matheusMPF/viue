import type { NextRequest } from 'next/server';

import { REFRESH_TOKEN_COOKIE } from '@/constants/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { authService } from '@/services/auth';

export async function POST(request: NextRequest) {
  try {
    const result = await authService.refresh(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
    const response = successResponse({ user: result.user });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
