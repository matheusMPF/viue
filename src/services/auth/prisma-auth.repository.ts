import { Prisma } from '@/generated/prisma/client';
import type { otp_purpose } from '@/generated/prisma/enums';
import { OTP_MAX_ATTEMPTS } from '@/constants/auth';
import { prisma } from '@/lib/db';
import type {
  AuthRepository,
  ConsumeEmailChangeResult,
  OtpRecord,
  PasswordResetCompletion,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
  UserRecord,
} from './auth.repository';

const userSelect = {
  id: true,
  name: true,
  email: true,
  password_hash: true,
  email_verified: true,
  status: true,
  birth_date: true,
  created_at: true,
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
    birthDate: user.birth_date,
    createdAt: user.created_at,
  };
}

function mapOtp(otp: {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: otp_purpose;
  new_email: string | null;
  expires_at: Date;
  used_at: Date | null;
  attempts: number;
}): OtpRecord {
  return {
    id: otp.id,
    userId: otp.user_id,
    codeHash: otp.code_hash,
    purpose: otp.purpose,
    newEmail: otp.new_email,
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
    newEmail?: string;
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
          new_email: input.newEmail,
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

  async consumePasswordResetOtpAndCreateToken(input: {
    otpId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const consumed = await tx.tb_otp.updateMany({
        where: {
          id: input.otpId,
          user_id: input.userId,
          purpose: 'PASSWORD_RESET',
          used_at: null,
          attempts: { lt: OTP_MAX_ATTEMPTS },
          expires_at: { gt: input.now },
        },
        data: { used_at: input.now },
      });
      if (consumed.count !== 1) return false;

      await tx.tb_password_reset_token.updateMany({
        where: { user_id: input.userId, used_at: null },
        data: { used_at: input.now },
      });
      await tx.tb_password_reset_token.create({
        data: {
          user_id: input.userId,
          token_hash: input.tokenHash,
          expires_at: input.expiresAt,
        },
      });
      return true;
    });
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

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const token = await prisma.tb_password_reset_token.findUnique({
      where: { token_hash: tokenHash },
    });
    if (!token) return null;
    return {
      id: token.id,
      userId: token.user_id,
      tokenHash: token.token_hash,
      expiresAt: token.expires_at,
      usedAt: token.used_at,
    };
  }

  async completePasswordReset(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }): Promise<PasswordResetCompletion> {
    return prisma.$transaction(async (tx) => {
      const consumed = await tx.tb_password_reset_token.updateMany({
        where: {
          id: input.tokenId,
          user_id: input.userId,
          used_at: null,
          expires_at: { gt: input.now },
        },
        data: { used_at: input.now },
      });
      if (consumed.count !== 1) {
        const current = await tx.tb_password_reset_token.findUnique({
          where: { id: input.tokenId },
          select: { user_id: true, used_at: true, expires_at: true },
        });
        if (!current || current.user_id !== input.userId) return 'INVALID';
        if (current.used_at) return 'USED';
        if (current.expires_at.getTime() <= input.now.getTime()) return 'EXPIRED';
        return 'INVALID';
      }

      await tx.tb_user.update({
        where: { id: input.userId },
        data: { password_hash: input.passwordHash, updated_at: input.now },
      });
      await tx.tb_refresh_token.updateMany({
        where: { user_id: input.userId, revoked_at: null },
        data: { revoked_at: input.now },
      });
      await tx.tb_refresh_token.create({
        data: {
          user_id: input.userId,
          token_hash: input.newRefreshTokenHash,
          expires_at: input.newRefreshTokenExpiresAt,
        },
      });
      return 'SUCCESS';
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; birthDate?: Date | null },
  ): Promise<UserRecord> {
    const user = await prisma.tb_user.update({
      where: { id: userId },
      data: {
        name: data.name,
        birth_date: data.birthDate,
        updated_at: new Date(),
      },
      select: userSelect,
    });
    return mapUser(user);
  }

  async consumeEmailChangeOtp(input: {
    otpId: string;
    userId: string;
    newEmail: string;
  }): Promise<ConsumeEmailChangeResult> {
    try {
      return await prisma.$transaction(async (tx): Promise<ConsumeEmailChangeResult> => {
        const consumed = await tx.tb_otp.updateMany({
          where: {
            id: input.otpId,
            user_id: input.userId,
            used_at: null,
            attempts: { lt: OTP_MAX_ATTEMPTS },
          },
          data: { used_at: new Date() },
        });
        if (consumed.count !== 1) throw new Error('OTP was consumed concurrently.');
        await tx.tb_user.update({
          where: { id: input.userId },
          data: { email: input.newEmail, updated_at: new Date() },
        });
        return 'SUCCESS';
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return 'EMAIL_TAKEN';
      }
      throw error;
    }
  }

  async updatePasswordAndRotateSession(input: {
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.tb_user.update({
        where: { id: input.userId },
        data: { password_hash: input.passwordHash, updated_at: input.now },
      });
      await tx.tb_refresh_token.updateMany({
        where: { user_id: input.userId, revoked_at: null },
        data: { revoked_at: input.now },
      });
      await tx.tb_refresh_token.create({
        data: {
          user_id: input.userId,
          token_hash: input.newRefreshTokenHash,
          expires_at: input.newRefreshTokenExpiresAt,
        },
      });
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await prisma.tb_user.delete({ where: { id: userId } });
  }
}
