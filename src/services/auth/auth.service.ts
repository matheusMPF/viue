import { Prisma } from '@/generated/prisma/client';

import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  PASSWORD_RESET_GENERIC_MESSAGE,
  REFRESH_TOKEN_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
} from '@/constants/auth';
import { AuthError } from '@/lib/auth/errors';
import {
  generateOpaqueToken,
  generateOtpCode,
  hashToken,
  verifyTokenHash,
} from '@/lib/auth/crypto';
import type { OtpMailer } from '@/lib/brevo/brevo.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyOtpInput,
} from '@/schemas/auth';
import type { AuthTokens, OtpPurpose, PublicUser } from '@/types/auth';
import type { AuthRepository, UserRecord } from './auth.repository';

type AuthServiceDependencies = {
  repository: AuthRepository;
  mailer: OtpMailer;
  hashPassword: (password: string) => Promise<string>;
  verifyPassword: (hash: string, password: string) => Promise<boolean>;
  createAccessToken: (user: PublicUser) => Promise<string>;
  now?: () => Date;
};

function publicUser(user: UserRecord): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: AuthServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async register(input: RegisterInput): Promise<{ user: PublicUser; requiresVerification: true }> {
    if (await this.dependencies.repository.findUserByEmail(input.email)) {
      throw new AuthError('EMAIL_ALREADY_EXISTS', 'Este e-mail já possui uma conta.', 409);
    }
    this.dependencies.mailer.assertConfigured?.();

    const passwordHash = await this.dependencies.hashPassword(input.password);
    const { code, codeHash, expiresAt } = this.createOtp();
    let user: UserRecord;
    try {
      user = await this.dependencies.repository.createPendingUserWithOtp({
        name: input.name,
        email: input.email,
        passwordHash,
        codeHash,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AuthError('EMAIL_ALREADY_EXISTS', 'Este e-mail já possui uma conta.', 409);
      }
      throw error;
    }

    await this.dependencies.mailer.sendOtpEmail({
      to: user.email,
      name: user.name,
      code,
      purpose: 'EMAIL_VERIFICATION',
    });
    return { user: publicUser(user), requiresVerification: true };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthTokens | { resetToken: string }> {
    const user = await this.dependencies.repository.findUserByEmail(input.email);
    if (!user) throw new AuthError('INVALID_OTP', 'Código inválido.', 400);

    const otp = await this.dependencies.repository.findLatestOtp(user.id, input.purpose);
    if (!otp) throw new AuthError('INVALID_OTP', 'Código inválido.', 400);
    if (otp.usedAt) {
      throw new AuthError('OTP_ALREADY_USED', 'Este código já foi utilizado.', 400);
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthError('OTP_MAX_ATTEMPTS', 'Limite de tentativas excedido.', 400);
    }
    if (otp.expiresAt.getTime() <= this.now().getTime()) {
      throw new AuthError('OTP_EXPIRED', 'Este código expirou.', 400);
    }
    if (!verifyTokenHash(input.code, otp.codeHash)) {
      const attempts = await this.dependencies.repository.incrementOtpAttempts(otp.id);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        throw new AuthError('OTP_MAX_ATTEMPTS', 'Limite de tentativas excedido.', 400);
      }
      throw new AuthError('INVALID_OTP', 'Código inválido.', 400);
    }

    if (input.purpose === 'PASSWORD_RESET') {
      const resetToken = generateOpaqueToken();
      const now = this.now();
      const created = await this.dependencies.repository.consumePasswordResetOtpAndCreateToken({
        otpId: otp.id,
        userId: user.id,
        tokenHash: hashToken(resetToken),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_SECONDS * 1000),
        now,
      });
      if (!created) {
        throw new AuthError('OTP_ALREADY_USED', 'Este código já foi utilizado.', 400);
      }
      return { resetToken };
    }

    await this.dependencies.repository.consumeEmailVerificationOtp(otp.id, user.id);
    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.dependencies.repository.findUserByEmail(input.email);
    if (
      !user?.passwordHash ||
      !(await this.dependencies.verifyPassword(user.passwordHash, input.password))
    ) {
      throw new AuthError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401);
    }

    if (user.status === 'BLOCKED') {
      throw new AuthError('ACCOUNT_BLOCKED', 'Esta conta está bloqueada.', 403);
    }
    if (user.status === 'INACTIVE') {
      throw new AuthError('ACCOUNT_INACTIVE', 'Esta conta está inativa.', 403);
    }
    if (!user.emailVerified || user.status === 'PENDING') {
      await this.sendReplacementOtp(user, 'EMAIL_VERIFICATION');
      throw new AuthError('EMAIL_NOT_VERIFIED', 'Seu e-mail ainda não foi verificado.', 403, {
        requiresVerification: true,
      });
    }

    await this.dependencies.repository.updateLastLogin(user.id);
    return this.issueTokens(user);
  }

  async refresh(rawRefreshToken: string | undefined): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token inválido.', 401);
    }
    const current = await this.dependencies.repository.findRefreshTokenByHash(
      hashToken(rawRefreshToken),
    );
    if (!current || current.revokedAt) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token inválido.', 401);
    }
    if (current.expiresAt.getTime() <= this.now().getTime()) {
      throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Refresh token expirado.', 401);
    }
    this.assertCanAuthenticate(current.user);

    const user = publicUser(current.user);
    const accessToken = await this.dependencies.createAccessToken(user);
    const refreshToken = generateOpaqueToken();
    try {
      await this.dependencies.repository.rotateRefreshToken({
        currentTokenId: current.id,
        userId: current.user.id,
        newTokenHash: hashToken(refreshToken),
        expiresAt: this.refreshTokenExpiration(),
      });
    } catch {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token inválido.', 401);
    }
    return { accessToken, refreshToken, user };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.dependencies.repository.revokeRefreshToken(hashToken(rawRefreshToken));
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await this.dependencies.repository.findUserByEmail(input.email);
    if (user?.emailVerified && user.status === 'ACTIVE') {
      await this.sendReplacementOtp(user, 'PASSWORD_RESET');
    }
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async resendOtp(input: ResendOtpInput): Promise<{ message: string }> {
    const user = await this.dependencies.repository.findUserByEmail(input.email);
    if (!user) {
      if (input.purpose === 'PASSWORD_RESET') {
        return { message: PASSWORD_RESET_GENERIC_MESSAGE };
      }
      throw new AuthError('EMAIL_NOT_FOUND', 'Conta não encontrada.', 404);
    }
    await this.sendReplacementOtp(user, input.purpose);
    return { message: 'Um novo código foi enviado.' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<AuthTokens & { message: string }> {
    const token = await this.dependencies.repository.findPasswordResetTokenByHash(
      hashToken(input.resetToken),
    );
    if (!token) this.throwResetTokenError('INVALID');
    const now = this.now();
    if (token.usedAt) this.throwResetTokenError('USED');
    if (token.expiresAt.getTime() <= now.getTime()) this.throwResetTokenError('EXPIRED');

    const user = await this.dependencies.repository.findUserById(token.userId);
    if (!user) this.throwResetTokenError('INVALID');
    this.assertCanAuthenticate(user);

    const passwordHash = await this.dependencies.hashPassword(input.password);
    const refreshToken = generateOpaqueToken();
    const completion = await this.dependencies.repository.completePasswordReset({
      tokenId: token.id,
      userId: token.userId,
      passwordHash,
      newRefreshTokenHash: hashToken(refreshToken),
      newRefreshTokenExpiresAt: this.refreshTokenExpiration(),
      now,
    });
    if (completion !== 'SUCCESS') this.throwResetTokenError(completion);
    return {
      accessToken: await this.dependencies.createAccessToken(publicUser(user)),
      refreshToken,
      user: publicUser(user),
      message: 'Senha alterada com sucesso.',
    };
  }

  private createOtp(): { code: string; codeHash: string; expiresAt: Date } {
    const code = generateOtpCode();
    return {
      code,
      codeHash: hashToken(code),
      expiresAt: new Date(this.now().getTime() + OTP_TTL_MINUTES * 60_000),
    };
  }

  private async sendReplacementOtp(user: UserRecord, purpose: OtpPurpose): Promise<void> {
    this.dependencies.mailer.assertConfigured?.();
    const { code, codeHash, expiresAt } = this.createOtp();
    await this.dependencies.repository.replaceOtp({
      userId: user.id,
      codeHash,
      purpose,
      expiresAt,
    });
    await this.dependencies.mailer.sendOtpEmail({
      to: user.email,
      name: user.name,
      code,
      purpose,
    });
  }

  private assertCanAuthenticate(user: UserRecord): void {
    if (user.status === 'BLOCKED') {
      throw new AuthError('ACCOUNT_BLOCKED', 'Esta conta está bloqueada.', 403);
    }
    if (user.status !== 'ACTIVE') {
      throw new AuthError('ACCOUNT_INACTIVE', 'Esta conta está inativa.', 403);
    }
    if (!user.emailVerified) {
      throw new AuthError('EMAIL_NOT_VERIFIED', 'Seu e-mail ainda não foi verificado.', 403);
    }
  }

  private async issueTokens(userRecord: UserRecord): Promise<AuthTokens> {
    const user = publicUser(userRecord);
    const accessToken = await this.dependencies.createAccessToken(user);
    const refreshToken = generateOpaqueToken();
    await this.dependencies.repository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: this.refreshTokenExpiration(),
    });
    return { accessToken, refreshToken, user };
  }

  private refreshTokenExpiration(): Date {
    return new Date(this.now().getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  }

  private throwResetTokenError(status: 'INVALID' | 'EXPIRED' | 'USED'): never {
    if (status === 'EXPIRED') {
      throw new AuthError('RESET_TOKEN_EXPIRED', 'O token de recuperação expirou.', 401);
    }
    if (status === 'USED') {
      throw new AuthError('RESET_TOKEN_USED', 'O token de recuperação já foi utilizado.', 401);
    }
    throw new AuthError('INVALID_RESET_TOKEN', 'O token de recuperação é inválido.', 401);
  }
}
