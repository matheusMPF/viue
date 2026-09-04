'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  KeyRound,
  Mail,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';

import { AppNavigation } from '@/components/layout/app-navigation';
import { Button, ConfirmDialog, Input } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';
import { DEFAULT_PROFILE_SLUG } from '@/lib/profile/profiles';
import {
  formatBirthDateForDisplay,
  maskBirthDateInput,
  parseBirthDateInput,
} from '@/lib/utils/birth-date';

export type AccountProfileDto = {
  id: string;
  name: string;
  email: string;
  birthDate: string | null;
  createdAt: string;
};

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message);
  return payload.data;
}

function ProfileSection({
  profile,
  onProfileUpdate,
}: {
  profile: AccountProfileDto;
  onProfileUpdate: (profile: AccountProfileDto) => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState(profile.name);
  const [birthDateDisplay, setBirthDateDisplay] = useState(
    formatBirthDateForDisplay(profile.birthDate),
  );
  const [birthDateError, setBirthDateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBirthDateChange(event: ChangeEvent<HTMLInputElement>) {
    setBirthDateDisplay(maskBirthDateInput(event.target.value));
    setBirthDateError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const birthDateIso = birthDateDisplay ? parseBirthDateInput(birthDateDisplay) : null;
    if (birthDateDisplay && !birthDateIso) {
      setBirthDateError('Informe uma data de nascimento válida.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await authFetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), birthDate: birthDateIso }),
      });
      const data = await readJson(response);
      onProfileUpdate(data.profile);
      showToast({ title: 'Dados atualizados.', variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="account-section" aria-labelledby="profile-heading">
      <div className="content-control-heading">
        <div>
          <span className="content-control-icon">
            <UserRound aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="profile-heading">Dados pessoais</h2>
            <p>Membro desde {formatMemberSince(profile.createdAt)}</p>
          </div>
        </div>
      </div>
      <form className="account-form" onSubmit={handleSubmit}>
        <Input
          label="Nome"
          maxLength={120}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <Input
          description="Dia, mês e ano."
          error={birthDateError ?? error ?? undefined}
          inputMode="numeric"
          label="Data de nascimento"
          leftElement={<CalendarDays aria-hidden="true" size={18} strokeWidth={1.8} />}
          maxLength={10}
          onChange={handleBirthDateChange}
          placeholder="DD/MM/AAAA"
          value={birthDateDisplay}
        />
        <Button isLoading={isSaving} type="submit">
          Salvar
        </Button>
      </form>
    </section>
  );
}

function EmailSection({
  email,
  onEmailUpdate,
}: {
  email: string;
  onEmailUpdate: (email: string) => void;
}) {
  const showToast = useToast();
  const [isChanging, setIsChanging] = useState(false);
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIsChanging(false);
    setStep('request');
    setNewEmail('');
    setCode('');
    setError(null);
  }

  async function handleRequestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await authFetch('/api/user/me/email/request-change', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      await readJson(response);
      setStep('confirm');
      showToast({
        title: 'Código enviado.',
        description: `Confira ${newEmail}.`,
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await authFetch('/api/user/me/email/confirm-change', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await readJson(response);
      onEmailUpdate(data.profile.email);
      reset();
      showToast({ title: 'E-mail atualizado.', variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="account-section" aria-labelledby="email-heading">
      <div className="content-control-heading">
        <div>
          <span className="content-control-icon">
            <Mail aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="email-heading">E-mail</h2>
            <p>{email}</p>
          </div>
        </div>
        {!isChanging ? (
          <Button onClick={() => setIsChanging(true)} type="button" variant="outline">
            Alterar e-mail
          </Button>
        ) : null}
      </div>

      {isChanging && step === 'request' ? (
        <form className="account-form" onSubmit={handleRequestChange}>
          <Input
            error={error ?? undefined}
            label="Novo e-mail"
            onChange={(event) => setNewEmail(event.target.value)}
            required
            type="email"
            value={newEmail}
          />
          <div className="account-form-actions">
            <Button isLoading={isSubmitting} type="submit">
              Enviar código
            </Button>
            <Button onClick={reset} type="button" variant="ghost">
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {isChanging && step === 'confirm' ? (
        <form className="account-form" onSubmit={handleConfirmChange}>
          <Input
            description={`Enviamos um código de 6 dígitos para ${newEmail}.`}
            error={error ?? undefined}
            inputMode="numeric"
            label="Código de confirmação"
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
          <div className="account-form-actions">
            <Button isLoading={isSubmitting} type="submit">
              Confirmar
            </Button>
            <Button onClick={reset} type="button" variant="ghost">
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function PasswordSection() {
  const showToast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('As senhas novas não coincidem.');
      return;
    }
    setIsSaving(true);
    try {
      const response = await authFetch('/api/user/me/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      await readJson(response);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({
        title: 'Senha alterada.',
        description: 'Suas outras sessões foram desconectadas.',
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="account-section" aria-labelledby="security-heading">
      <div className="content-control-heading">
        <div>
          <span className="content-control-icon">
            <KeyRound aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="security-heading">Segurança</h2>
            <p>Trocar a senha desconecta suas outras sessões.</p>
          </div>
        </div>
      </div>
      <form className="account-form" onSubmit={handleSubmit}>
        <Input
          autoComplete="current-password"
          label="Senha atual"
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
        <Input
          autoComplete="new-password"
          label="Nova senha"
          minLength={8}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
        <Input
          autoComplete="new-password"
          error={error ?? undefined}
          label="Confirmar nova senha"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
        <Button isLoading={isSaving} type="submit">
          Salvar nova senha
        </Button>
      </form>
    </section>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const showToast = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await authFetch('/api/user/me', { method: 'DELETE' });
      await readJson(response);
      router.replace('/entrar');
      router.refresh();
    } catch (err) {
      showToast({
        title: 'Não foi possível excluir a conta.',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
      setIsDeleting(false);
    }
  }

  return (
    <section className="account-section is-danger" aria-labelledby="danger-heading">
      <div className="content-control-heading">
        <div>
          <span className="content-control-icon is-danger">
            <ShieldAlert aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="danger-heading">Excluir conta</h2>
            <p>
              Remove permanentemente seus dados, avaliações, amizades e salas que você criou. Essa
              ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={() => setIsConfirmOpen(true)} type="button" variant="danger">
        <Trash2 aria-hidden="true" size={17} /> Excluir conta
      </Button>

      <ConfirmDialog
        confirmLabel="Excluir conta"
        confirmVariant="danger"
        description="Essa ação é permanente. Todos os seus dados, avaliações, amizades e salas que você criou serão removidos e não poderão ser recuperados."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title="Excluir sua conta?"
      />
    </section>
  );
}

export function AccountScreen({ initialProfile }: { initialProfile: AccountProfileDto }) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="home-app">
      <AppNavigation profile={DEFAULT_PROFILE_SLUG} />
      <div className="home-workspace">
        <main className="account-page">
          <header className="catalog-header">
            <Link className="catalog-back" href={`/${DEFAULT_PROFILE_SLUG}`}>
              <ArrowLeft aria-hidden="true" size={18} /> Voltar
            </Link>
            <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
          </header>

          <section className="account-heading">
            <div className="account-heading-top">
              <div>
                <span className="home-kicker">Sua conta</span>
                <h1>Minha conta</h1>
                <p>Gerencie seus dados, e-mail, senha e privacidade.</p>
              </div>
              <span aria-hidden="true" className="account-avatar">
                {getInitials(profile.name)}
              </span>
            </div>
          </section>

          <div className="account-sections">
            <ProfileSection onProfileUpdate={setProfile} profile={profile} />
            <EmailSection
              email={profile.email}
              onEmailUpdate={(email) => setProfile((current) => ({ ...current, email }))}
            />
            <PasswordSection />
            <DangerZoneSection />
          </div>
        </main>
      </div>
    </div>
  );
}
