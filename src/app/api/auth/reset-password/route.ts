import { RATE_LIMITS } from '@/constants/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, messageResponse, parseBody } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ResetPasswordSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:reset-password', RATE_LIMITS.resetPassword);
    const input = await parseBody(request, ResetPasswordSchema);
    const result = await authService.resetPassword(input);
    const response = messageResponse(result.message);
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
