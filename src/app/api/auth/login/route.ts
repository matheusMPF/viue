import { RATE_LIMITS } from '@/constants/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { LoginSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:login', RATE_LIMITS.login);
    const input = await parseBody(request, LoginSchema);
    const result = await authService.login(input);
    const response = successResponse({ user: result.user });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
