import { RATE_LIMITS } from '@/constants/auth';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { RequestEmailChangeSchema } from '@/schemas/account';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'account:changeEmail', RATE_LIMITS.changeEmail);
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, RequestEmailChangeSchema);
    const result = await authService.requestEmailChange(user.id, input);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
