import type { OtpPurpose } from '@/types/auth';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING';
  birthDate: Date | null;
  createdAt: Date;
};

export type OtpRecord = {
  id: string;
  userId: string;
  codeHash: string;
  purpose: OtpPurpose;
  newEmail: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
};

export type ConsumeEmailChangeResult = 'SUCCESS' | 'EMAIL_TAKEN';

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserRecord;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type PasswordResetCompletion = 'SUCCESS' | 'INVALID' | 'EXPIRED' | 'USED';

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
    newEmail?: string;
  }): Promise<OtpRecord>;
  findLatestOtp(userId: string, purpose: OtpPurpose): Promise<OtpRecord | null>;
  incrementOtpAttempts(otpId: string): Promise<number>;
  consumeEmailVerificationOtp(otpId: string, userId: string): Promise<void>;
  consumePasswordResetOtpAndCreateToken(input: {
    otpId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean>;
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
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  completePasswordReset(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }): Promise<PasswordResetCompletion>;
  updateProfile(
    userId: string,
    data: { name?: string; birthDate?: Date | null },
  ): Promise<UserRecord>;
  consumeEmailChangeOtp(input: {
    otpId: string;
    userId: string;
    newEmail: string;
  }): Promise<ConsumeEmailChangeResult>;
  updatePasswordAndRotateSession(input: {
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
