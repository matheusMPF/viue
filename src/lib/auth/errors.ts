export type AuthErrorCode =
  | 'INVALID_REQUEST'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_BLOCKED'
  | 'ACCOUNT_INACTIVE'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_MAX_ATTEMPTS'
  | 'OTP_ALREADY_USED'
  | 'INVALID_PURPOSE'
  | 'INVALID_RESET_TOKEN'
  | 'RESET_TOKEN_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EMAIL_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: { requiresVerification?: boolean },
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
