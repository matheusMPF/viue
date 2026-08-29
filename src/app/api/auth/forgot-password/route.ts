import { RATE_LIMITS } from '@/constants/auth';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ForgotPasswordSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:forgot-password', RATE_LIMITS.forgotPassword);
    const input = await parseBody(request, ForgotPasswordSchema);
    return successResponse(await authService.forgotPassword(input));
  } catch (error) {
    return errorResponse(error);
  }
}
