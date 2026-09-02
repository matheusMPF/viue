import { RATE_LIMITS } from '@/constants/auth';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { clearAuthCookies, setAccessTokenCookie } from '@/lib/auth/cookies';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { enforceRateLimit } from '@/lib/auth/rate-limiter';
import { DeleteAccountSchema, UpdateProfileSchema } from '@/schemas/account';
import { authService } from '@/services/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const profile = await authService.getProfile(user.id);
    return successResponse({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, UpdateProfileSchema);
    const result = await authService.updateProfile(user.id, input);
    const response = successResponse({ profile: result.profile });
    setAccessTokenCookie(response, result.accessToken);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await enforceRateLimit(request, 'account:deleteAccount', RATE_LIMITS.deleteAccount);
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, DeleteAccountSchema);
    await authService.deleteAccount(user.id, input);
    const response = successResponse({ message: 'Conta excluída.' });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
