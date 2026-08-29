import { RATE_LIMITS } from '@/constants/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { VerifyOtpSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:verify-otp', RATE_LIMITS.verifyOtp);
    const input = await parseBody(request, VerifyOtpSchema);
    const result = await authService.verifyOtp(input);
    if ('resetToken' in result) return successResponse(result);

    const response = successResponse({ user: result.user });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
