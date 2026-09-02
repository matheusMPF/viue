export const ACCESS_TOKEN_COOKIE = 'viue_access_token';
export const REFRESH_TOKEN_COOKIE = 'viue_refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const RESET_TOKEN_TTL_SECONDS = 15 * 60;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const JWT_ALGORITHM = 'HS256';
export const JWT_ISSUER = 'viue';
export const JWT_ACCESS_AUDIENCE = 'viue:web';

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'Se o e-mail estiver cadastrado, enviaremos um código para recuperação da senha.';

export const RATE_LIMITS = {
  register: { limit: 5, windowMs: 15 * 60_000 },
  login: { limit: 10, windowMs: 15 * 60_000 },
  verifyOtp: { limit: 10, windowMs: 10 * 60_000 },
  resendOtp: { limit: 3, windowMs: 10 * 60_000 },
  forgotPassword: { limit: 5, windowMs: 15 * 60_000 },
  resetPassword: { limit: 5, windowMs: 15 * 60_000 },
  refresh: { limit: 30, windowMs: 15 * 60_000 },
  changeEmail: { limit: 5, windowMs: 15 * 60_000 },
  confirmEmailChange: { limit: 10, windowMs: 10 * 60_000 },
  changePassword: { limit: 5, windowMs: 15 * 60_000 },
  deleteAccount: { limit: 5, windowMs: 15 * 60_000 },
} as const;
