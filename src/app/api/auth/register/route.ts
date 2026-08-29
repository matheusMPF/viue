import { RATE_LIMITS } from '@/constants/auth';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { RegisterSchema } from '@/schemas/auth';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'auth:register', RATE_LIMITS.register);
    const input = await parseBody(request, RegisterSchema);
    return successResponse(await authService.register(input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
