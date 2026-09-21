import { RATE_LIMITS } from '@/constants/auth';
import { errorResponse, messageResponse, parseBody } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ForgotPasswordSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, ForgotPasswordSchema);
    await enforceRateLimit(
      request,
      'auth:forgot-password',
      RATE_LIMITS.forgotPassword,
      input.email,
    );
    const result = await authService.forgotPassword(input);
    return messageResponse(result.message);
  } catch (error) {
    return errorResponse(error);
  }
}
