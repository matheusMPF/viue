import type { otp_purpose, user_status } from '@/generated/prisma/enums';

export type OtpPurpose = otp_purpose;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthUser = PublicUser & {
  emailVerified: boolean;
  status: user_status;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export type AccessTokenPayload = PublicUser;

export type ResetTokenPayload = {
  sub: string;
  otpId: string;
  purpose: 'PASSWORD_RESET';
};

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  code: string;
  message: string;
  requiresVerification?: boolean;
};
