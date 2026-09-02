'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Gamepad2,
  LockKeyhole,
  Mail,
  RefreshCw,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Button, Input, Tabs } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';

type AuthView = 'login' | 'register' | 'forgot' | 'otp' | 'reset';
type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
type ApiSuccess<T> = { success: true; data: T } | ({ success: true } & T);
type ApiFailure = {
  success: false;
  code: string;
  message: string;
  requiresVerification?: boolean;
};

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requiresVerification = false,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function postJson<T>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || !payload.success) {
    const failure = payload as ApiFailure;
    throw new ApiRequestError(
      failure.message || 'Não foi possível concluir a solicitação.',
      failure.code || 'UNKNOWN_ERROR',
      failure.requiresVerification,
    );
  }

  return 'data' in payload ? payload.data : (payload as T);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'w-12' : 'w-14'}>
      <Image
        alt="Símbolo da Viuê"
        className="h-auto w-full"
        height={1280}
        priority
        src="/brand/viue-symbol.png"
        width={1280}
      />
    </div>
  );
}

function PasswordInput({
  autoComplete,
  error,
  label,
  name,
  placeholder,
}: {
  autoComplete: string;
  error?: ReactNode;
  label: string;
  name: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      autoComplete={autoComplete}
      className="auth-control"
      error={error}
      inputClassName="auth-control-input"
      label={label}
      leftElement={<LockKeyhole aria-hidden="true" size={18} strokeWidth={1.8} />}
      minLength={8}
      name={name}
      placeholder={placeholder}
      required
      rightElement={
        <Button
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          size="icon"
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          variant="ghost"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </Button>
      }
      type={visible ? 'text' : 'password'}
    />
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="auth-back"
      leftIcon={<ArrowLeft aria-hidden="true" size={18} />}
      onClick={onClick}
      size="sm"
      variant="ghost"
    >
      Voltar
    </Button>
  );
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  if (!error && !notice) return null;

  return (
    <p
      className={error ? 'auth-feedback is-error' : 'auth-feedback is-success'}
      role={error ? 'alert' : 'status'}
    >
      {error || notice}
    </p>
  );
}

function sanitizeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get('next'));
  const showToast = useToast();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('EMAIL_VERIFICATION');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function changeView(nextView: AuthView) {
    setError('');
    setNotice('');
    setView(nextView);
  }

  function getErrorMessage(requestError: unknown) {
    return requestError instanceof Error
      ? requestError.message
      : 'Não foi possível concluir a solicitação.';
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get('email') ?? '').trim();

    try {
      const data = await postJson<{ user: { name: string } }>('/api/auth/login', {
        email: submittedEmail,
        password: String(form.get('password') ?? ''),
      });
      showToast({
        description: `Bem-vindo de volta, ${data.user.name}.`,
        title: 'Login realizado',
        variant: 'success',
      });
      router.replace(next);
      router.refresh();
    } catch (requestError) {
      if (
        requestError instanceof ApiRequestError &&
        requestError.code === 'EMAIL_NOT_VERIFIED' &&
        requestError.requiresVerification
      ) {
        setEmail(submittedEmail);
        setOtpPurpose('EMAIL_VERIFICATION');
        setResendSeconds(60);
        const verificationMessage =
          'Você precisa concluir a validação do seu e-mail. Enviamos um novo código.';
        setNotice(verificationMessage);
        showToast({
          description: verificationMessage,
          title: 'Validação de e-mail pendente',
          variant: 'warning',
        });
        setView('otp');
      } else {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password !== confirmPassword) {
      setError('As senhas informadas não são iguais.');
      return;
    }

    setIsSubmitting(true);
    const submittedEmail = String(form.get('email') ?? '').trim();
    try {
      await postJson('/api/auth/register', {
        name: String(form.get('name') ?? '').trim(),
        email: submittedEmail,
        password,
      });
      setEmail(submittedEmail);
      setOtpPurpose('EMAIL_VERIFICATION');
      setOtpCode('');
      setResendSeconds(60);
      setNotice('Enviamos um código de confirmação para seu e-mail.');
      showToast({
        description: 'Enviamos um código para você confirmar o endereço informado.',
        title: 'Conta pré-cadastrada',
        variant: 'success',
      });
      setView('otp');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get('email') ?? '').trim();

    try {
      const data = await postJson<{ message: string }>('/api/auth/forgot-password', {
        email: submittedEmail,
      });
      setEmail(submittedEmail);
      setOtpPurpose('PASSWORD_RESET');
      setOtpCode('');
      setResendSeconds(60);
      setNotice(data.message);
      setView('otp');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const data = await postJson<{ resetToken?: string; user?: { name: string } }>(
        '/api/auth/verify-otp',
        { email, code: otpCode, purpose: otpPurpose },
      );
      if (otpPurpose === 'PASSWORD_RESET' && data.resetToken) {
        setResetToken(data.resetToken);
        changeView('reset');
      } else {
        showToast({
          description: 'Seu e-mail foi confirmado e sua sessão está ativa.',
          title: 'Conta validada',
          variant: 'success',
        });
        router.replace(next);
        router.refresh();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      const data = await postJson<{ message: string }>('/api/auth/resend-otp', {
        email,
        purpose: otpPurpose,
      });
      setOtpCode('');
      setResendSeconds(60);
      setNotice(data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) {
      setError('As senhas informadas não são iguais.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await postJson<{ message: string }>('/api/auth/reset-password', {
        resetToken,
        password,
      });
      setResetToken('');
      setOtpCode('');
      changeView('login');
      setNotice(data.message);
      showToast({
        description: 'Sua nova senha foi salva e sua sessão já está ativa.',
        title: data.message,
        variant: 'success',
      });
      router.replace(next);
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isPrimaryView = view === 'login' || view === 'register';

  return (
    <main className="auth-stage">
      <Image
        alt="Amigos reunidos em uma sala de cinema"
        className="auth-backdrop"
        fill
        priority
        sizes="(max-width: 820px) 100vw, 72vw"
        src="/images/auth-cinema-community.png"
      />
      <div aria-hidden="true" className="auth-scrim" />

      <section className="auth-story" aria-label="Comunidade Viuê">
        <Brand />
        <div className="auth-story-copy">
          <span className="auth-kicker">
            <Film aria-hidden="true" size={16} />
            Sua próxima descoberta começa aqui
          </span>
          <h1>Entretenimento é melhor quando compartilhado.</h1>
          <p>
            Registre o que você assiste, joga e lê. Compartilhe avaliações e guarde suas descobertas
            com quem importa.
          </p>
        </div>

        <div className="auth-scope" aria-label="Categorias da Viuê">
          <div>
            <Clapperboard aria-hidden="true" size={19} />
            <span>
              <strong>Agora</strong>
              Filmes e séries
            </span>
          </div>
          <div>
            <Gamepad2 aria-hidden="true" size={19} />
            <span>
              <strong>Em breve</strong>
              Games e livros
            </span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Acesso à Viuê">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <Brand compact />
            <span>
              <UsersRound aria-hidden="true" size={15} />
              entretenimento em comunidade
            </span>
          </div>

          {isPrimaryView && (
            <>
              <div className="auth-heading">
                <span className="auth-eyebrow">Bem-vindo à sua sessão</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  {view === 'login' ? 'Entre na conversa' : 'Crie seu perfil'}
                </h2>
                <p>
                  {view === 'login'
                    ? 'Continue de onde parou e veja o que sua comunidade está descobrindo.'
                    : 'Sua lista, suas avaliações e as pessoas que compartilham seus interesses.'}
                </p>
              </div>

              <Tabs
                ariaLabel="Escolha como acessar"
                className="auth-tabs-component"
                items={[
                  { label: 'Entrar', value: 'login' },
                  { label: 'Criar conta', value: 'register' },
                ]}
                onValueChange={(value) => changeView(value as AuthView)}
                value={view}
              />
            </>
          )}

          {view === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <Input
                autoComplete="email"
                className="auth-control"
                defaultValue={email}
                inputClassName="auth-control-input"
                label="E-mail"
                leftElement={<Mail aria-hidden="true" size={18} strokeWidth={1.8} />}
                name="email"
                placeholder="voce@exemplo.com"
                required
                type="email"
              />
              <PasswordInput
                autoComplete="current-password"
                label="Senha"
                name="password"
                placeholder="Digite sua senha"
              />
              <div className="auth-form-row auth-form-row-end">
                <Button className="auth-link" onClick={() => changeView('forgot')} variant="ghost">
                  Esqueci minha senha
                </Button>
              </div>
              <Feedback error={error} notice={notice} />
              <Button
                fullWidth
                isLoading={isSubmitting}
                rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                size="lg"
                type="submit"
              >
                Entrar na Viuê
              </Button>
            </form>
          )}

          {view === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <Input
                autoComplete="name"
                className="auth-control"
                inputClassName="auth-control-input"
                label="Como podemos chamar você?"
                leftElement={<UserRound aria-hidden="true" size={18} strokeWidth={1.8} />}
                maxLength={120}
                minLength={2}
                name="name"
                placeholder="Seu nome"
                required
              />
              <Input
                autoComplete="email"
                className="auth-control"
                defaultValue={email}
                inputClassName="auth-control-input"
                label="E-mail"
                leftElement={<Mail aria-hidden="true" size={18} strokeWidth={1.8} />}
                name="email"
                placeholder="voce@exemplo.com"
                required
                type="email"
              />
              <div className="auth-password-grid">
                <PasswordInput
                  autoComplete="new-password"
                  label="Senha"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordInput
                  autoComplete="new-password"
                  label="Confirme a senha"
                  name="confirmPassword"
                  placeholder="Repita sua senha"
                />
              </div>
              <label className="auth-check auth-terms">
                <input name="terms" required type="checkbox" />
                <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
              </label>
              <Feedback error={error} notice={notice} />
              <Button
                fullWidth
                isLoading={isSubmitting}
                rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                size="lg"
                type="submit"
              >
                Criar minha conta
              </Button>
            </form>
          )}

          {view === 'forgot' && (
            <div className="auth-flow">
              <BackButton onClick={() => changeView('login')} />
              <div className="auth-flow-icon">
                <Mail aria-hidden="true" size={24} />
              </div>
              <div className="auth-heading">
                <span className="auth-eyebrow">Recupere seu acesso</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  Vamos encontrar sua conta
                </h2>
                <p>Enviaremos um código de segurança para o e-mail cadastrado.</p>
              </div>
              <form className="auth-form" onSubmit={handleForgotPassword}>
                <Input
                  autoComplete="email"
                  className="auth-control"
                  inputClassName="auth-control-input"
                  label="E-mail"
                  leftElement={<Mail aria-hidden="true" size={18} strokeWidth={1.8} />}
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                  type="email"
                  value={email}
                />
                <Feedback error={error} notice={notice} />
                <Button
                  fullWidth
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                  size="lg"
                  type="submit"
                >
                  Enviar código
                </Button>
              </form>
            </div>
          )}

          {view === 'otp' && (
            <div className="auth-flow">
              <BackButton
                onClick={() =>
                  changeView(otpPurpose === 'EMAIL_VERIFICATION' ? 'register' : 'forgot')
                }
              />
              <div className="auth-flow-icon">
                <LockKeyhole aria-hidden="true" size={24} />
              </div>
              <div className="auth-heading">
                <span className="auth-eyebrow">Confirmação de segurança</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  Confira seu e-mail
                </h2>
                <p>
                  Digite o código de 6 dígitos enviado para <strong>{email}</strong>.
                </p>
              </div>
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <Input
                  aria-label="Código de verificação de 6 dígitos"
                  autoComplete="one-time-code"
                  className="auth-control auth-otp-control"
                  inputClassName="auth-control-input auth-otp-input"
                  inputMode="numeric"
                  label="Código de verificação"
                  maxLength={6}
                  name="otp"
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  required
                  value={otpCode}
                />
                <Feedback error={error} notice={notice} />
                <Button
                  fullWidth
                  isLoading={isSubmitting}
                  rightIcon={<Check aria-hidden="true" size={18} />}
                  size="lg"
                  type="submit"
                >
                  Verificar código
                </Button>
                <Button
                  className="auth-resend"
                  disabled={isSubmitting || resendSeconds > 0}
                  leftIcon={<RefreshCw aria-hidden="true" size={16} />}
                  onClick={handleResendOtp}
                  size="sm"
                  variant="ghost"
                >
                  {resendSeconds > 0 ? `Reenviar em ${resendSeconds}s` : 'Reenviar código'}
                </Button>
              </form>
            </div>
          )}

          {view === 'reset' && (
            <div className="auth-flow">
              <BackButton onClick={() => changeView('forgot')} />
              <div className="auth-flow-icon">
                <LockKeyhole aria-hidden="true" size={24} />
              </div>
              <div className="auth-heading">
                <span className="auth-eyebrow">Proteja sua conta</span>
                <h2 ref={headingRef} tabIndex={-1}>
                  Crie uma nova senha
                </h2>
                <p>Use pelo menos 8 caracteres e evite senhas utilizadas em outros serviços.</p>
              </div>
              <form className="auth-form" onSubmit={handleResetPassword}>
                <PasswordInput
                  autoComplete="new-password"
                  label="Nova senha"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordInput
                  autoComplete="new-password"
                  label="Confirme a nova senha"
                  name="confirmPassword"
                  placeholder="Repita sua senha"
                />
                <Feedback error={error} notice={notice} />
                <Button
                  fullWidth
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                  size="lg"
                  type="submit"
                >
                  Alterar senha
                </Button>
              </form>
            </div>
          )}

          <p className="auth-security-note">
            <LockKeyhole aria-hidden="true" size={13} /> Seus dados de acesso são enviados por uma
            conexão protegida.
          </p>
        </div>
      </section>
    </main>
  );
}
