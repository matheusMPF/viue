import { describe, expect, it, vi } from 'vitest';

import { OTP_MAX_ATTEMPTS, RESET_TOKEN_TTL_SECONDS } from '@/constants/auth';
import { hashToken } from '@/lib/auth/crypto';
import type { OtpPurpose } from '@/types/auth';
import type {
  AuthRepository,
  OtpRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
  UserRecord,
} from './auth.repository';
import { AuthService } from './auth.service';

const NOW = new Date('2026-08-27T12:00:00.000Z');

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    name: 'Matheus',
    email: 'matheus@email.com',
    passwordHash: 'hash:senha-segura',
    emailVerified: true,
    status: 'ACTIVE',
    birthDate: null,
    createdAt: NOW,
    ...overrides,
  };
}

class FakeAuthRepository implements AuthRepository {
  users: UserRecord[] = [];
  otps: OtpRecord[] = [];
  passwordResetTokens: PasswordResetTokenRecord[] = [];
  refreshTokens: RefreshTokenRecord[] = [];
  lastLoginUserId: string | null = null;
  passwordResetCount = 0;

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createPendingUserWithOtp(input: {
    name: string;
    email: string;
    passwordHash: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }) {
    const user = makeUser({
      id: `user-${this.users.length + 1}`,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerified: false,
      status: 'PENDING',
    });
    this.users.push(user);
    this.otps.push({
      id: `otp-${this.otps.length + 1}`,
      userId: user.id,
      codeHash: input.codeHash,
      purpose: input.purpose,
      newEmail: null,
      expiresAt: input.expiresAt,
      usedAt: null,
      attempts: 0,
    });
    return user;
  }

  async replaceOtp(input: {
    userId: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
    newEmail?: string;
  }) {
    for (const otp of this.otps) {
      if (otp.userId === input.userId && otp.purpose === input.purpose) {
        otp.usedAt = NOW;
        otp.attempts = OTP_MAX_ATTEMPTS;
      }
    }
    const otp: OtpRecord = {
      id: `otp-${this.otps.length + 1}`,
      userId: input.userId,
      codeHash: input.codeHash,
      purpose: input.purpose,
      newEmail: input.newEmail ?? null,
      expiresAt: input.expiresAt,
      usedAt: null,
      attempts: 0,
    };
    this.otps.push(otp);
    return otp;
  }

  async findLatestOtp(userId: string, purpose: OtpPurpose) {
    return (
      [...this.otps].reverse().find((otp) => otp.userId === userId && otp.purpose === purpose) ??
      null
    );
  }

  async incrementOtpAttempts(otpId: string) {
    const otp = this.otps.find((item) => item.id === otpId)!;
    otp.attempts += 1;
    return otp.attempts;
  }

  async consumeEmailVerificationOtp(otpId: string, userId: string) {
    this.otps.find((otp) => otp.id === otpId)!.usedAt = NOW;
    const user = this.users.find((item) => item.id === userId)!;
    user.emailVerified = true;
    user.status = 'ACTIVE';
  }

  async consumePasswordResetOtpAndCreateToken(input: {
    otpId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }) {
    const otp = this.otps.find(
      (item) =>
        item.id === input.otpId &&
        item.userId === input.userId &&
        item.purpose === 'PASSWORD_RESET' &&
        !item.usedAt &&
        item.attempts < OTP_MAX_ATTEMPTS &&
        item.expiresAt.getTime() > input.now.getTime(),
    );
    if (!otp) return false;
    otp.usedAt = input.now;
    for (const token of this.passwordResetTokens) {
      if (token.userId === input.userId && !token.usedAt) token.usedAt = input.now;
    }
    this.passwordResetTokens.push({
      id: `reset-${this.passwordResetTokens.length + 1}`,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
    return true;
  }

  async updateLastLogin(userId: string) {
    this.lastLoginUserId = userId;
  }

  async createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    const user = (await this.findUserById(input.userId))!;
    this.refreshTokens.push({
      id: `refresh-${this.refreshTokens.length + 1}`,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      user,
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.refreshTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async rotateRefreshToken(input: {
    currentTokenId: string;
    userId: string;
    newTokenHash: string;
    expiresAt: Date;
  }) {
    this.refreshTokens.find((token) => token.id === input.currentTokenId)!.revokedAt = NOW;
    await this.createRefreshToken({
      userId: input.userId,
      tokenHash: input.newTokenHash,
      expiresAt: input.expiresAt,
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    const token = this.refreshTokens.find((item) => item.tokenHash === tokenHash);
    if (token && !token.revokedAt) token.revokedAt = NOW;
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return this.passwordResetTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async completePasswordReset(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }) {
    const token = this.passwordResetTokens.find((item) => item.id === input.tokenId);
    if (!token || token.userId !== input.userId) return 'INVALID' as const;
    if (token.usedAt) return 'USED' as const;
    if (token.expiresAt.getTime() <= input.now.getTime()) return 'EXPIRED' as const;
    token.usedAt = input.now;
    this.users.find((user) => user.id === input.userId)!.passwordHash = input.passwordHash;
    for (const token of this.refreshTokens) {
      if (token.user.id === input.userId && !token.revokedAt) token.revokedAt = NOW;
    }
    await this.createRefreshToken({
      userId: input.userId,
      tokenHash: input.newRefreshTokenHash,
      expiresAt: input.newRefreshTokenExpiresAt,
    });
    this.passwordResetCount += 1;
    return 'SUCCESS' as const;
  }

  async updateProfile(userId: string, data: { name?: string; birthDate?: Date | null }) {
    const user = this.users.find((item) => item.id === userId)!;
    if (data.name !== undefined) user.name = data.name;
    if (data.birthDate !== undefined) user.birthDate = data.birthDate;
    return user;
  }

  async consumeEmailChangeOtp(input: { otpId: string; userId: string; newEmail: string }) {
    const otp = this.otps.find((item) => item.id === input.otpId);
    if (!otp || otp.usedAt) return 'EMAIL_TAKEN' as const;
    if (this.users.some((user) => user.email === input.newEmail && user.id !== input.userId)) {
      return 'EMAIL_TAKEN' as const;
    }
    otp.usedAt = NOW;
    this.users.find((user) => user.id === input.userId)!.email = input.newEmail;
    return 'SUCCESS' as const;
  }

  async updatePasswordAndRotateSession(input: {
    userId: string;
    passwordHash: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
    now: Date;
  }) {
    this.users.find((user) => user.id === input.userId)!.passwordHash = input.passwordHash;
    for (const token of this.refreshTokens) {
      if (token.user.id === input.userId && !token.revokedAt) token.revokedAt = input.now;
    }
    await this.createRefreshToken({
      userId: input.userId,
      tokenHash: input.newRefreshTokenHash,
      expiresAt: input.newRefreshTokenExpiresAt,
    });
  }

  async deleteUser(userId: string) {
    this.users = this.users.filter((user) => user.id !== userId);
  }
}

function setup() {
  const repository = new FakeAuthRepository();
  const sentEmails: Array<{ to: string; code: string; purpose: OtpPurpose }> = [];
  const notifyAccountCreated = vi.fn(async () => undefined);
  const service = new AuthService({
    repository,
    mailer: {
      sendOtpEmail: vi.fn(async ({ to, code, purpose }) => {
        sentEmails.push({ to, code, purpose });
      }),
    },
    hashPassword: async (password) => `hash:${password}`,
    verifyPassword: async (hash, password) => hash === `hash:${password}`,
    createAccessToken: async (user) => `access:${user.id}`,
    notifyAccountCreated,
    now: () => NOW,
  });
  return { repository, sentEmails, notifyAccountCreated, service };
}

function seedOtp(
  repository: FakeAuthRepository,
  code: string,
  purpose: OtpPurpose,
  overrides: Partial<OtpRecord> = {},
) {
  const otp: OtpRecord = {
    id: `otp-${repository.otps.length + 1}`,
    userId: 'user-1',
    codeHash: hashToken(code),
    purpose,
    newEmail: null,
    expiresAt: new Date(NOW.getTime() + 60_000),
    usedAt: null,
    attempts: 0,
    ...overrides,
  };
  repository.otps.push(otp);
  return otp;
}

async function expectAuthError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('AuthService', () => {
  it('cadastra uma conta PENDING e gera OTP EMAIL_VERIFICATION', async () => {
    const { repository, sentEmails, service } = setup();
    const result = await service.register({
      name: 'Matheus',
      email: 'matheus@email.com',
      password: 'senha-segura',
    });
    expect(result.requiresVerification).toBe(true);
    expect(repository.users[0]).toMatchObject({ status: 'PENDING', emailVerified: false });
    expect(repository.users[0].passwordHash).toBe('hash:senha-segura');
    expect(repository.otps[0].purpose).toBe('EMAIL_VERIFICATION');
    expect(repository.otps[0].codeHash).not.toBe(sentEmails[0].code);
    expect(sentEmails[0].purpose).toBe('EMAIL_VERIFICATION');
  });

  it('rejeita cadastro com e-mail existente', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    await expectAuthError(
      service.register({ name: 'Outro', email: 'matheus@email.com', password: '12345678' }),
      'EMAIL_ALREADY_EXISTS',
    );
    expect(repository.users).toHaveLength(1);
  });

  it('valida OTP EMAIL_VERIFICATION e ativa a conta', async () => {
    const { repository, notifyAccountCreated, service } = setup();
    repository.users.push(makeUser({ emailVerified: false, status: 'PENDING' }));
    seedOtp(repository, '482913', 'EMAIL_VERIFICATION');
    const result = await service.verifyOtp({
      email: 'matheus@email.com',
      code: '482913',
      purpose: 'EMAIL_VERIFICATION',
    });
    expect('accessToken' in result && result.accessToken).toBe('access:user-1');
    expect(repository.users[0]).toMatchObject({ emailVerified: true, status: 'ACTIVE' });
    expect(notifyAccountCreated).toHaveBeenCalledWith('user-1');
  });

  it('rejeita OTP expirado', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', 'EMAIL_VERIFICATION', { expiresAt: new Date(NOW.getTime() - 1) });
    await expectAuthError(
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '482913',
        purpose: 'EMAIL_VERIFICATION',
      }),
      'OTP_EXPIRED',
    );
  });

  it('incrementa tentativas ao receber OTP incorreto', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    const otp = seedOtp(repository, '482913', 'EMAIL_VERIFICATION');
    await expectAuthError(
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '111111',
        purpose: 'EMAIL_VERIFICATION',
      }),
      'INVALID_OTP',
    );
    expect(otp.attempts).toBe(1);
  });

  it('bloqueia OTP ao atingir o limite de tentativas', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', 'EMAIL_VERIFICATION', { attempts: OTP_MAX_ATTEMPTS - 1 });
    await expectAuthError(
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '111111',
        purpose: 'EMAIL_VERIFICATION',
      }),
      'OTP_MAX_ATTEMPTS',
    );
  });

  it('rejeita OTP já utilizado', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', 'EMAIL_VERIFICATION', { usedAt: NOW });
    await expectAuthError(
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '482913',
        purpose: 'EMAIL_VERIFICATION',
      }),
      'OTP_ALREADY_USED',
    );
  });

  it('valida OTP PASSWORD_RESET sem gerar autenticação normal', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', 'PASSWORD_RESET');
    const result = await service.verifyOtp({
      email: 'matheus@email.com',
      code: '482913',
      purpose: 'PASSWORD_RESET',
    });
    expect(result).toEqual({ resetToken: expect.any(String) });
    const resetToken = 'resetToken' in result ? result.resetToken : '';
    expect(repository.passwordResetTokens).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: hashToken(resetToken),
        usedAt: null,
      }),
    ]);
    expect(repository.passwordResetTokens[0].tokenHash).not.toBe(resetToken);
    expect(repository.passwordResetTokens[0].expiresAt).toEqual(
      new Date(NOW.getTime() + RESET_TOKEN_TTL_SECONDS * 1000),
    );
    expect(repository.refreshTokens).toHaveLength(0);
  });

  it('invalida um reset token anterior ao confirmar um novo OTP', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    repository.passwordResetTokens.push({
      id: 'reset-anterior',
      userId: 'user-1',
      tokenHash: hashToken('token-anterior'),
      expiresAt: new Date(NOW.getTime() + 60_000),
      usedAt: null,
    });
    seedOtp(repository, '482913', 'PASSWORD_RESET');

    await service.verifyOtp({
      email: 'matheus@email.com',
      code: '482913',
      purpose: 'PASSWORD_RESET',
    });

    expect(repository.passwordResetTokens).toHaveLength(2);
    expect(repository.passwordResetTokens[0].usedAt).toEqual(NOW);
    expect(repository.passwordResetTokens[1].usedAt).toBeNull();
  });

  it.each([
    ['PASSWORD_RESET', 'EMAIL_VERIFICATION'],
    ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
  ] as const)('não aceita OTP %s no fluxo %s', async (storedPurpose, requestedPurpose) => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', storedPurpose);
    await expectAuthError(
      service.verifyOtp({ email: 'matheus@email.com', code: '482913', purpose: requestedPurpose }),
      'INVALID_OTP',
    );
  });

  it('faz login com credenciais válidas', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    const result = await service.login({ email: 'matheus@email.com', password: 'senha-segura' });
    expect(result.accessToken).toBe('access:user-1');
    expect(repository.lastLoginUserId).toBe('user-1');
    expect(repository.refreshTokens).toHaveLength(1);
  });

  it('rejeita login com senha inválida', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    await expectAuthError(
      service.login({ email: 'matheus@email.com', password: 'errada' }),
      'INVALID_CREDENTIALS',
    );
  });

  it('rejeita login PENDING e envia novo OTP', async () => {
    const { repository, sentEmails, service } = setup();
    repository.users.push(makeUser({ emailVerified: false, status: 'PENDING' }));
    await expectAuthError(
      service.login({ email: 'matheus@email.com', password: 'senha-segura' }),
      'EMAIL_NOT_VERIFIED',
    );
    expect(sentEmails[0].purpose).toBe('EMAIL_VERIFICATION');
  });

  it.each([
    ['BLOCKED', 'ACCOUNT_BLOCKED'],
    ['INACTIVE', 'ACCOUNT_INACTIVE'],
  ] as const)('rejeita login de usuário %s', async (status, code) => {
    const { repository, service } = setup();
    repository.users.push(makeUser({ status }));
    await expectAuthError(
      service.login({ email: 'matheus@email.com', password: 'senha-segura' }),
      code,
    );
  });

  it('rotaciona refresh token válido', async () => {
    const { repository, service } = setup();
    const user = makeUser();
    repository.users.push(user);
    repository.refreshTokens.push({
      id: 'refresh-1',
      tokenHash: hashToken('raw-token'),
      expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null,
      user,
    });
    const result = await service.refresh('raw-token');
    expect(result.accessToken).toBe('access:user-1');
    expect(repository.refreshTokens[0].revokedAt).toEqual(NOW);
    expect(repository.refreshTokens).toHaveLength(2);
  });

  it.each([
    [new Date(NOW.getTime() - 1), null, 'REFRESH_TOKEN_EXPIRED'],
    [new Date(NOW.getTime() + 60_000), NOW, 'INVALID_REFRESH_TOKEN'],
  ] as const)('rejeita refresh expirado ou revogado', async (expiresAt, revokedAt, code) => {
    const { repository, service } = setup();
    const user = makeUser();
    repository.users.push(user);
    repository.refreshTokens.push({
      id: 'refresh-1',
      tokenHash: hashToken('raw-token'),
      expiresAt,
      revokedAt,
      user,
    });
    await expectAuthError(service.refresh('raw-token'), code);
  });

  it('faz logout de forma idempotente e revoga o refresh token', async () => {
    const { repository, service } = setup();
    const user = makeUser();
    repository.users.push(user);
    repository.refreshTokens.push({
      id: 'refresh-1',
      tokenHash: hashToken('raw-token'),
      expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null,
      user,
    });
    await service.logout('raw-token');
    await service.logout('raw-token');
    expect(repository.refreshTokens[0].revokedAt).toEqual(NOW);
  });

  it('inicia recuperação sem revelar se o e-mail existe', async () => {
    const existing = setup();
    existing.repository.users.push(makeUser());
    const known = await existing.service.forgotPassword({ email: 'matheus@email.com' });
    const unknown = await existing.service.forgotPassword({ email: 'desconhecido@email.com' });
    expect(known).toEqual(unknown);
    expect(existing.sentEmails[0].purpose).toBe('PASSWORD_RESET');
  });

  it('não envia recuperação para conta ainda não verificada', async () => {
    const { repository, sentEmails, service } = setup();
    repository.users.push(makeUser({ emailVerified: false, status: 'PENDING' }));

    const result = await service.forgotPassword({ email: 'matheus@email.com' });

    expect(result.message).toContain('Se o e-mail estiver cadastrado');
    expect(sentEmails).toHaveLength(0);
  });

  it('redefine a senha, invalida o reset token e revoga sessões', async () => {
    const { repository, service } = setup();
    const user = makeUser();
    repository.users.push(user);
    seedOtp(repository, '482913', 'PASSWORD_RESET');
    const verification = await service.verifyOtp({
      email: user.email,
      code: '482913',
      purpose: 'PASSWORD_RESET',
    });
    const resetToken = 'resetToken' in verification ? verification.resetToken : '';
    repository.refreshTokens.push({
      id: 'refresh-1',
      tokenHash: 'hash',
      expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null,
      user,
    });

    const result = await service.resetPassword({ resetToken, password: 'nova-senha' });
    expect(user.passwordHash).toBe('hash:nova-senha');
    expect(repository.refreshTokens[0].revokedAt).toEqual(NOW);
    expect(repository.refreshTokens).toHaveLength(2);
    expect(repository.refreshTokens[1].revokedAt).toBeNull();
    expect(repository.refreshTokens[1].tokenHash).toBe(hashToken(result.refreshToken));
    expect(repository.refreshTokens[1].tokenHash).not.toBe(result.refreshToken);
    expect(result).toMatchObject({
      accessToken: 'access:user-1',
      message: 'Senha alterada com sucesso.',
      user: { id: 'user-1' },
    });
    await expect(
      service.resetPassword({ resetToken, password: 'outra-senha' }),
    ).rejects.toMatchObject({
      code: 'RESET_TOKEN_USED',
      message: 'O token de recuperação já foi utilizado.',
      status: 401,
    });
  });

  it('rejeita reset token expirado', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    repository.passwordResetTokens.push({
      id: 'reset-1',
      userId: 'user-1',
      tokenHash: hashToken('expired'),
      expiresAt: new Date(NOW.getTime() - 1),
      usedAt: null,
    });
    await expect(
      service.resetPassword({ resetToken: 'expired', password: 'nova-senha' }),
    ).rejects.toMatchObject({
      code: 'RESET_TOKEN_EXPIRED',
      message: 'O token de recuperação expirou.',
      status: 401,
    });
  });

  it('rejeita reset token inválido', async () => {
    const { service } = setup();
    await expect(
      service.resetPassword({ resetToken: 'desconhecido', password: 'nova-senha' }),
    ).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
      message: 'O token de recuperação é inválido.',
      status: 401,
    });
  });

  it('permite que apenas uma validação simultânea consuma o OTP', async () => {
    const { repository, service } = setup();
    repository.users.push(makeUser());
    seedOtp(repository, '482913', 'PASSWORD_RESET');

    const results = await Promise.allSettled([
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '482913',
        purpose: 'PASSWORD_RESET',
      }),
      service.verifyOtp({
        email: 'matheus@email.com',
        code: '482913',
        purpose: 'PASSWORD_RESET',
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(repository.passwordResetTokens).toHaveLength(1);
  });
});
