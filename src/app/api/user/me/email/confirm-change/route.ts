import { RATE_LIMITS } from '@/constants/auth';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { setAccessTokenCookie } from '@/lib/auth/cookies';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ConfirmEmailChangeSchema } from '@/schemas/account';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'account:confirmEmailChange', RATE_LIMITS.confirmEmailChange);
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, ConfirmEmailChangeSchema);
    const result = await authService.confirmEmailChange(user.id, input);
    const response = successResponse({ profile: result.profile });
    setAccessTokenCookie(response, result.accessToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
