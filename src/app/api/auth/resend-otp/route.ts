import { RATE_LIMITS } from '@/constants/auth';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ResendOtpSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:resend-otp', RATE_LIMITS.resendOtp);
    const input = await parseBody(request, ResendOtpSchema);
    return successResponse(await authService.resendOtp(input));
  } catch (error) {
    return errorResponse(error);
  }
}
