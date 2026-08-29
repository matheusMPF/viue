import type { NextRequest } from 'next/server';

import { REFRESH_TOKEN_COOKIE } from '@/constants/auth';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { authService } from '@/services/auth';

export async function POST(request: NextRequest) {
  try {
    await authService.logout(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
    const response = successResponse({ message: 'Sessão encerrada.' });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
