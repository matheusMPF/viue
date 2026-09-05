'use client';

import Image from 'next/image';
import {
  Bookmark,
  CalendarRange,
  Check,
  Film,
  Heart,
  LoaderCircle,
  Settings2,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Tv,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Button, ConfirmDialog, Input, Label } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';
import type {
  MatchContentType,
  MatchFilters,
  MatchSessionView,
  MatchVoteDecision,
} from '@/types/community/match';

type MatchPayload =
  { success: true; data: MatchSessionView | null } | { success: false; message?: string };

function typeLabel(type: MatchContentType) {
  return type === 'MOVIE' ? 'filme' : 'série';
}

function parseNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function MatchParticipants({ session }: { session: MatchSessionView }) {
  return (
    <div
      className="room-match-people"
      aria-label={`Participantes desta sessão: ${session.participants.map((person) => person.name).join(', ')}`}
    >
      {session.participants.map((person) => (
        <span aria-hidden="true" key={person.id} title={person.name}>
          {person.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </span>
      ))}
      <small aria-hidden="true">{session.participantCount} participantes fixos</small>
    </div>
  );
}

function MatchPoster({
  alt,
  posterUrl,
  type,
}: {
  alt: string;
  posterUrl: string | null;
  type: MatchContentType;
}) {
  return (
    <div className="room-match-session-poster">
      {posterUrl ? (
        <Image alt={alt} fill priority sizes="(max-width: 720px) 72vw, 300px" src={posterUrl} />
      ) : type === 'MOVIE' ? (
        <Film aria-hidden="true" size={42} />
      ) : (
        <Tv aria-hidden="true" size={42} />
      )}
    </div>
  );
}

function FilterForm({
  isSubmitting,
  onSubmit,
  session,
}: {
  isSubmitting: boolean;
  onSubmit: (filters: MatchFilters) => void;
  session: MatchSessionView;
}) {
  const filters = session.round?.filters ?? {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      genreId: parseNumber(formData, 'genreId'),
      runtimeMax: parseNumber(formData, 'runtimeMax'),
      runtimeMin: parseNumber(formData, 'runtimeMin'),
      yearFrom: parseNumber(formData, 'yearFrom'),
      yearTo: parseNumber(formData, 'yearTo'),
    });
  }

  return (
    <form className="room-match-filter-form" key={session.round?.id} onSubmit={handleSubmit}>
      <div className="room-match-filter-field">
        <Label htmlFor="match-genre">Gênero</Label>
        <select defaultValue={filters.genreId ?? ''} id="match-genre" name="genreId">
          <option value="">Todos os gêneros</option>
          {session.filterOptions.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>
      <div className="room-match-filter-grid">
        <Input
          defaultValue={filters.yearFrom}
          label="Ano inicial"
          leftElement={<CalendarRange aria-hidden="true" size={16} />}
          max={new Date().getUTCFullYear() + 5}
          min={1900}
          name="yearFrom"
          placeholder="Ex.: 2000"
          type="number"
        />
        <Input
          defaultValue={filters.yearTo}
          label="Ano final"
          leftElement={<CalendarRange aria-hidden="true" size={16} />}
          max={new Date().getUTCFullYear() + 5}
          min={1900}
          name="yearTo"
          placeholder="Ex.: 2026"
          type="number"
        />
        <Input
          defaultValue={filters.runtimeMin}
          label="Duração mínima"
          leftElement={<Timer aria-hidden="true" size={16} />}
          min={1}
          name="runtimeMin"
          placeholder="Minutos"
          type="number"
        />
        <Input
          defaultValue={filters.runtimeMax}
          label="Duração máxima"
          leftElement={<Timer aria-hidden="true" size={16} />}
          max={600}
          min={20}
          name="runtimeMax"
          placeholder="Minutos"
          type="number"
        />
      </div>
      <Button fullWidth isLoading={isSubmitting} type="submit">
        Gerar nova rodada
      </Button>
    </form>
  );
}

export function RoomMatch({
  initialSession,
  roomId,
}: {
  initialSession: MatchSessionView;
  roomId: string;
}) {
  const [session, setSession] = useState(initialSession);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const showToast = useToast();
  const sessionId = session.id;
  const sessionStatus = session.status;

  useEffect(() => {
    if (pendingAction !== null || (sessionStatus !== 'WAITING' && sessionStatus !== 'ACTIVE')) {
      return;
    }
    let cancelled = false;
    let refreshing = false;

    async function refresh() {
      if (cancelled || refreshing || document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
        const response = await authFetch(`/api/community/rooms/${roomId}/match/${sessionId}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as MatchPayload;
        if (!cancelled && response.ok && payload.success && payload.data) {
          setSession(payload.data);
        }
      } catch {
        // A próxima consulta recupera a sincronização sem descartar o voto local.
      } finally {
        refreshing = false;
      }
    }

    const interval = window.setInterval(() => void refresh(), 1_500);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [pendingAction, roomId, sessionId, sessionStatus]);

  async function patchSession(body: Record<string, unknown>, action: string) {
    setPendingAction(action);
    try {
      const response = await authFetch(`/api/community/rooms/${roomId}/match/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as MatchPayload;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.success ? 'Não foi possível concluir a ação.' : payload.message);
      }
      setSession(payload.data);
      if (body.action === 'cancel') setShowCancelConfirmation(false);
    } catch (error) {
      showToast({
        title: 'Não foi possível atualizar o Match',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function addMatchedContentToLibrary() {
    const matchedContent = session.matchedContent;
    if (!matchedContent || matchedContent.isInMyLibrary || pendingAction !== null) return;

    setPendingAction('add-to-list');
    try {
      const response = await authFetch(`/api/catalog/content/${matchedContent.contentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'WANT_TO_WATCH' }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Não foi possível atualizar sua lista.');
      }
      setSession((current) =>
        current.matchedContent
          ? {
              ...current,
              matchedContent: { ...current.matchedContent, isInMyLibrary: true },
            }
          : current,
      );
      showToast({
        title: 'Adicionado à sua lista',
        description: `${matchedContent.title} foi salvo para assistir.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setPendingAction(null);
    }
  }

  function vote(decision: MatchVoteDecision) {
    if (!session.currentCandidate || session.round?.hasVotedCurrentCandidate) return;
    void patchSession(
      {
        action: 'vote',
        candidateId: session.currentCandidate.candidateId,
        decision,
      },
      `vote-${decision}`,
    );
  }

  const isTerminal = session.status === 'MATCHED' || session.status === 'CANCELED';
  const pendingVoteDecision: MatchVoteDecision | null =
    pendingAction === 'vote-PASS' ? 'PASS' : pendingAction === 'vote-LIKE' ? 'LIKE' : null;
  const currentUserDecision = session.round?.currentUserDecision ?? pendingVoteDecision;
  const isWaitingForVotes = Boolean(
    session.status === 'ACTIVE' &&
    session.currentCandidate &&
    (session.round?.hasVotedCurrentCandidate || pendingVoteDecision),
  );
  const visibleCandidateVoteCount =
    (session.round?.currentCandidateVoteCount ?? 0) +
    (pendingVoteDecision && !session.round?.hasVotedCurrentCandidate ? 1 : 0);

  return (
    <section
      className="room-match-session room-match-session-dedicated"
      aria-labelledby="match-title"
    >
      <div className="room-match-session-heading">
        <div>
          <span className="home-kicker">
            Sessão de {session.type === 'MOVIE' ? 'filmes' : 'séries'}
          </span>
          <h2 id="match-title">Match</h2>
        </div>
        {!isTerminal ? (
          <span className="room-match-live">
            <i /> Sincronizado
          </span>
        ) : null}
      </div>

      {session.status === 'WAITING' || (session.round?.candidateCount === 0 && !isTerminal) ? (
        <div className="room-match-status" role="status">
          <LoaderCircle aria-hidden="true" className="room-match-spinner" size={30} />
          <h3>Preparando as melhores opções</h3>
          <p>Cruzando listas, avaliações, gêneros e títulos ainda não assistidos pelo grupo.</p>
        </div>
      ) : null}

      {session.status === 'ACTIVE' && session.currentCandidate ? (
        <div className="room-match-vote">
          <MatchPoster
            alt={`Poster de ${session.currentCandidate.title}`}
            posterUrl={session.currentCandidate.posterUrl}
            type={session.type}
          />
          <div className="room-match-vote-copy">
            <div className="room-match-progress-copy">
              <span>
                Rodada {session.round?.number} · opção {session.currentCandidate.position} de{' '}
                {session.round?.candidateCount}
              </span>
              <span>{session.round?.myVoteCount ?? 0} votos seus</span>
            </div>
            <div className="room-match-progress" aria-hidden="true">
              <span
                style={{
                  width: `${((session.round?.myVoteCount ?? 0) / (session.round?.candidateCount ?? 1)) * 100}%`,
                }}
              />
            </div>
            <span className="room-match-question">
              Você assistiria a este {typeLabel(session.type)}?
            </span>
            <h3>{session.currentCandidate.title}</h3>
            <p className="room-match-meta">
              {[
                session.currentCandidate.releaseYear,
                ...session.currentCandidate.genres.slice(0, 2),
              ]
                .filter(Boolean)
                .join(' · ')}
              {session.currentCandidate.rating ? ` · ★ ${session.currentCandidate.rating}` : ''}
            </p>
            <p className="room-match-overview">
              {session.currentCandidate.description || 'Sinopse não disponível.'}
            </p>

            <div className="room-match-vote-actions">
              <Button
                aria-pressed={currentUserDecision === 'PASS'}
                className={currentUserDecision === 'PASS' ? 'is-selected' : ''}
                disabled={pendingAction !== null || isWaitingForVotes}
                isLoading={pendingAction === 'vote-PASS'}
                leftIcon={<ThumbsDown aria-hidden="true" size={19} />}
                onClick={() => vote('PASS')}
                variant="outline"
              >
                Passar
              </Button>
              <Button
                aria-pressed={currentUserDecision === 'LIKE'}
                className={currentUserDecision === 'LIKE' ? 'is-selected' : ''}
                disabled={pendingAction !== null || isWaitingForVotes}
                isLoading={pendingAction === 'vote-LIKE'}
                leftIcon={<ThumbsUp aria-hidden="true" size={19} />}
                onClick={() => vote('LIKE')}
              >
                Curtir
              </Button>
            </div>
            {isWaitingForVotes ? (
              <div className="room-match-waiting-votes" role="status" aria-live="polite">
                <LoaderCircle aria-hidden="true" className="room-match-spinner" size={20} />
                <div>
                  <strong>Voto registrado</strong>
                  <span>
                    Aguardando outros votos... {visibleCandidateVoteCount} de{' '}
                    {session.participantCount} votaram.
                  </span>
                </div>
              </div>
            ) : null}
            <MatchParticipants session={session} />
          </div>
        </div>
      ) : null}

      {session.status === 'ACTIVE' && !session.currentCandidate && session.round?.candidateCount ? (
        session.round.isExhausted ? (
          <div className="room-match-exhausted">
            <div className="room-match-status">
              <Settings2 aria-hidden="true" size={30} />
              <h3>Ainda não encontramos um Match</h3>
              <p>
                {session.isOwner
                  ? 'Ajuste os filtros para gerar até 50 opções novas, sem repetir as anteriores.'
                  : `${session.owner.name} pode ajustar os filtros e iniciar uma nova rodada.`}
              </p>
            </div>
            {session.isOwner ? (
              <FilterForm
                isSubmitting={pendingAction === 'next-round'}
                onSubmit={(filters) =>
                  void patchSession({ action: 'next-round', filters }, 'next-round')
                }
                session={session}
              />
            ) : null}
          </div>
        ) : (
          <div className="room-match-status" role="status">
            <LoaderCircle aria-hidden="true" className="room-match-spinner" size={30} />
            <h3>Sincronizando a rodada</h3>
            <p>O próximo título aparecerá assim que todos concluírem o voto atual.</p>
          </div>
        )
      ) : null}

      {session.status === 'MATCHED' && session.matchedContent ? (
        <div className="room-match-result" role="status">
          <MatchPoster
            alt={`Poster de ${session.matchedContent.title}`}
            posterUrl={session.matchedContent.posterUrl}
            type={session.type}
          />
          <div>
            <span className="room-match-result-badge">
              <Heart aria-hidden="true" fill="currentColor" size={18} /> Deu Match!
            </span>
            <h3>{session.matchedContent.title}</h3>
            <p>
              Todos escolheram assistir a este {typeLabel(session.type)}. Agora só falta marcar a
              sessão.
            </p>
            <MatchParticipants session={session} />
            {session.matchedContent.isInMyLibrary ? (
              <span className="room-match-library-state">
                <Check aria-hidden="true" size={17} /> Já está na sua lista
              </span>
            ) : (
              <Button
                disabled={pendingAction !== null}
                isLoading={pendingAction === 'add-to-list'}
                leftIcon={<Bookmark aria-hidden="true" size={18} />}
                onClick={() => void addMatchedContentToLibrary()}
              >
                Adicionar à minha lista
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {session.status === 'CANCELED' ? (
        <div className="room-match-status" role="status">
          <UsersRound aria-hidden="true" size={30} />
          <h3>Este Match foi encerrado</h3>
          <p>Os votos foram preservados, mas esta sessão não recebe mais novas escolhas.</p>
        </div>
      ) : null}

      {!isTerminal ? (
        <div className="room-match-session-footer">
          <span>
            <UserRound aria-hidden="true" size={15} /> Sessão iniciada por {session.owner.name}
          </span>
          {session.isOwner ? (
            <Button onClick={() => setShowCancelConfirmation(true)} size="sm" variant="ghost">
              Encerrar Match
            </Button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Encerrar sessão"
        confirmVariant="danger"
        description="Os votos e as rodadas serão preservados, mas ninguém poderá continuar votando nesta sessão."
        isConfirming={pendingAction === 'cancel'}
        onConfirm={() => void patchSession({ action: 'cancel' }, 'cancel')}
        onOpenChange={setShowCancelConfirmation}
        open={showCancelConfirmation}
        title="Encerrar este Match?"
      />
    </section>
  );
}
