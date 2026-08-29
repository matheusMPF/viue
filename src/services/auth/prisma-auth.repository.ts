import { Prisma } from '@/generated/prisma/client';
import type { otp_purpose } from '@/generated/prisma/enums';
import { OTP_MAX_ATTEMPTS } from '@/constants/auth';
import { prisma } from '@/lib/db';
import type { AuthRepository, OtpRecord, RefreshTokenRecord, UserRecord } from './auth.repository';

const userSelect = {
  id: true,
  name: true,
  email: true,
  password_hash: true,
  email_verified: true,
  status: true,
} satisfies Prisma.tb_userSelect;

type SelectedUser = Prisma.tb_userGetPayload<{ select: typeof userSelect }>;

function mapUser(user: SelectedUser): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    emailVerified: user.email_verified,
    status: user.status,
  };
}

function mapOtp(otp: {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: otp_purpose;
  expires_at: Date;
  used_at: Date | null;
  attempts: number;
}): OtpRecord {
  return {
    id: otp.id,
    userId: otp.user_id,
    codeHash: otp.code_hash,
    purpose: otp.purpose,
    expiresAt: otp.expires_at,
    usedAt: otp.used_at,
    attempts: otp.attempts,
  };
}

export class PrismaAuthRepository implements AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.tb_user.findUnique({ where: { email }, select: userSelect });
    return user ? mapUser(user) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const user = await prisma.tb_user.findUnique({ where: { id }, select: userSelect });
    return user ? mapUser(user) : null;
  }

  async createPendingUserWithOtp(input: {
    name: string;
    email: string;
    passwordHash: string;
    codeHash: string;
    purpose: otp_purpose;
    expiresAt: Date;
  }): Promise<UserRecord> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.tb_user.create({
        data: {
          name: input.name,
          email: input.email,
          password_hash: input.passwordHash,
          status: 'PENDING',
          email_verified: false,
        },
        select: userSelect,
      });
      await tx.tb_otp.create({
        data: {
          user_id: user.id,
          code_hash: input.codeHash,
          purpose: input.purpose,
          expires_at: input.expiresAt,
        },
      });
      return mapUser(user);
    });
  }

  async replaceOtp(input: {
    userId: string;
    codeHash: string;
    purpose: otp_purpose;
    expiresAt: Date;
  }): Promise<OtpRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.tb_otp.updateMany({
        where: { user_id: input.userId, purpose: input.purpose },
        data: { used_at: new Date(), attempts: OTP_MAX_ATTEMPTS },
      });
      const otp = await tx.tb_otp.create({
        data: {
          user_id: input.userId,
          code_hash: input.codeHash,
          purpose: input.purpose,
          expires_at: input.expiresAt,
        },
      });
      return mapOtp(otp);
    });
  }

  async findLatestOtp(userId: string, purpose: otp_purpose): Promise<OtpRecord | null> {
    const otp = await prisma.tb_otp.findFirst({
      where: { user_id: userId, purpose },
      orderBy: { created_at: 'desc' },
    });
    return otp ? mapOtp(otp) : null;
  }

  async incrementOtpAttempts(otpId: string): Promise<number> {
    const otp = await prisma.tb_otp.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return otp.attempts;
  }

  async consumeEmailVerificationOtp(otpId: string, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.tb_otp.updateMany({
        where: { id: otpId, user_id: userId, used_at: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
        data: { used_at: new Date() },
      });
      if (consumed.count !== 1) throw new Error('OTP was consumed concurrently.');
      await tx.tb_user.update({
        where: { id: userId },
        data: { email_verified: true, status: 'ACTIVE', updated_at: new Date() },
      });
    });
  }

  async consumePasswordResetOtp(otpId: string): Promise<void> {
    const consumed = await prisma.tb_otp.updateMany({
      where: { id: otpId, used_at: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { used_at: new Date() },
    });
    if (consumed.count !== 1) throw new Error('OTP was consumed concurrently.');
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.tb_user.update({
      where: { id: userId },
      data: { last_login_at: new Date(), updated_at: new Date() },
    });
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.tb_refresh_token.create({
      data: {
        user_id: input.userId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await prisma.tb_refresh_token.findUnique({
      where: { token_hash: tokenHash },
      include: { tb_user: { select: userSelect } },
    });
    if (!token) return null;
    return {
      id: token.id,
      tokenHash: token.token_hash,
      expiresAt: token.expires_at,
      revokedAt: token.revoked_at,
      user: mapUser(token.tb_user),
    };
  }

  async rotateRefreshToken(input: {
    currentTokenId: string;
    userId: string;
    newTokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const revoked = await tx.tb_refresh_token.updateMany({
        where: { id: input.currentTokenId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      if (revoked.count !== 1) throw new Error('Refresh token was rotated concurrently.');
      await tx.tb_refresh_token.create({
        data: {
          user_id: input.userId,
          token_hash: input.newTokenHash,
          expires_at: input.expiresAt,
        },
      });
    });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.tb_refresh_token.updateMany({
      where: { token_hash: tokenHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async completePasswordReset(input: {
    userId: string;
    otpId: string;
    passwordHash: string;
  }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const authorization = await tx.tb_otp.findFirst({
        where: {
          id: input.otpId,
          user_id: input.userId,
          purpose: 'PASSWORD_RESET',
          used_at: { not: null },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        select: { id: true },
      });
      if (!authorization) return false;

      await tx.tb_otp.delete({ where: { id: authorization.id } });
      await tx.tb_user.update({
        where: { id: input.userId },
        data: { password_hash: input.passwordHash, updated_at: new Date() },
      });
      await tx.tb_refresh_token.updateMany({
        where: { user_id: input.userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      return true;
    });
  }
}
