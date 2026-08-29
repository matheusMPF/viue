import { RATE_LIMITS } from '@/constants/auth';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ResetPasswordSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:reset-password', RATE_LIMITS.resetPassword);
    const input = await parseBody(request, ResetPasswordSchema);
    return successResponse(await authService.resetPassword(input));
  } catch (error) {
    return errorResponse(error);
  }
}
