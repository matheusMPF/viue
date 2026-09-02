import { RATE_LIMITS } from '@/constants/auth';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { setAuthCookies } from '@/lib/auth/cookies';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { ChangePasswordSchema } from '@/schemas/account';
import { authService } from '@/services/auth';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, 'account:changePassword', RATE_LIMITS.changePassword);
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, ChangePasswordSchema);
    const result = await authService.changePassword(user.id, input);
    const response = successResponse({ message: 'Senha alterada com sucesso.' });
    setAuthCookies(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
