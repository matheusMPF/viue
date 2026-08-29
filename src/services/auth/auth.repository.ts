import type { OtpPurpose } from '@/types/auth';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING';
};

export type OtpRecord = {
  id: string;
  userId: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
};

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserRecord;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createPendingUserWithOtp(input: {
    name: string;
    email: string;
    passwordHash: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<UserRecord>;
  replaceOtp(input: {
    userId: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<OtpRecord>;
  findLatestOtp(userId: string, purpose: OtpPurpose): Promise<OtpRecord | null>;
  incrementOtpAttempts(otpId: string): Promise<number>;
  consumeEmailVerificationOtp(otpId: string, userId: string): Promise<void>;
  consumePasswordResetOtp(otpId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(input: {
    currentTokenId: string;
    userId: string;
    newTokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  completePasswordReset(input: {
    userId: string;
    otpId: string;
    passwordHash: string;
  }): Promise<boolean>;
}
