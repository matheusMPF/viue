'use client';

import { ArrowRight, Film, LoaderCircle, Sparkles, Tv, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';
import type { MatchContentType, MatchSessionView } from '@/types/community/match';

type MatchPayload =
  { success: true; data: MatchSessionView | null } | { success: false; message?: string };

function matchHref(roomId: string, sessionId: string) {
  return `/comunidade/salas/${roomId}/match/${sessionId}`;
}

export function RoomMatchLobby({
  initialSession,
  participantCount,
  roomId,
}: {
  initialSession: MatchSessionView | null;
  participantCount: number;
  roomId: string;
}) {
  const [session, setSession] = useState(initialSession);
  const [pendingType, setPendingType] = useState<MatchContentType | null>(null);
  const router = useRouter();
  const showToast = useToast();
  const isOngoing = session?.status === 'WAITING' || session?.status === 'ACTIVE';

  useEffect(() => {
    if (pendingType !== null) return;
    let cancelled = false;
    let refreshing = false;

    async function refresh() {
      if (cancelled || refreshing || document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
        const response = await authFetch(`/api/community/rooms/${roomId}/match`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as MatchPayload;
        if (!cancelled && response.ok && payload.success) setSession(payload.data);
      } catch {
        // A próxima consulta recupera a sincronização sem interromper a sala.
      } finally {
        refreshing = false;
      }
    }

    const interval = window.setInterval(() => void refresh(), 2_000);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [pendingType, roomId]);

  async function start(type: MatchContentType) {
    setPendingType(type);
    try {
      const response = await authFetch(`/api/community/rooms/${roomId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const payload = (await response.json()) as MatchPayload;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.success ? 'Não foi possível iniciar.' : payload.message);
      }
      setSession(payload.data);
      router.push(matchHref(roomId, payload.data.id));
    } catch (error) {
      showToast({
        title: 'Não foi possível iniciar o Match',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setPendingType(null);
    }
  }

  return (
    <section className="room-match-session" aria-labelledby="room-match-title">
      <div className="room-match-session-heading">
        <div>
          <span className="home-kicker">Escolha em grupo</span>
          <h2 id="room-match-title">Match</h2>
        </div>
        {isOngoing ? (
          <span className="room-match-live">
            <i /> Em andamento
          </span>
        ) : null}
      </div>

      {isOngoing && session ? (
        <div className="room-match-lobby-active">
          <div className="room-match-lobby-icon">
            {session.status === 'WAITING' ? (
              <LoaderCircle aria-hidden="true" className="room-match-spinner" size={28} />
            ) : (
              <UsersRound aria-hidden="true" size={28} />
            )}
          </div>
          <div aria-live="polite">
            <h3>Match em andamento</h3>
            <p>
              {session.owner.name} iniciou um Match de{' '}
              {session.type === 'MOVIE' ? 'Filmes' : 'Séries'} com {session.participantCount}{' '}
              participantes.
            </p>
            {session.status === 'WAITING' ? (
              <small>As recomendações ainda estão sendo preparadas.</small>
            ) : null}
          </div>
          {session.isParticipant ? (
            <Button
              rightIcon={<ArrowRight aria-hidden="true" size={18} />}
              onClick={() => router.push(matchHref(roomId, session.id))}
            >
              Entrar no Match
            </Button>
          ) : (
            <small className="room-match-lobby-unavailable">
              Os participantes desta sessão já foram definidos.
            </small>
          )}
        </div>
      ) : (
        <div className="room-match-start">
          <div>
            <Sparkles aria-hidden="true" size={28} />
            <h3>Encontre algo para assistir juntos</h3>
            <p>
              A Viuê ordena títulos com maior chance de agradar ao grupo. Os votos são privados.
            </p>
          </div>
          <div className="room-match-start-actions">
            <Button
              className="room-match-series-button"
              disabled={participantCount < 2 || pendingType !== null}
              isLoading={pendingType === 'MOVIE'}
              leftIcon={<Film aria-hidden="true" size={18} />}
              onClick={() => void start('MOVIE')}
            >
              Match de Filmes
            </Button>
            <Button
              disabled={participantCount < 2 || pendingType !== null}
              isLoading={pendingType === 'SERIES'}
              leftIcon={<Tv aria-hidden="true" size={18} />}
              onClick={() => void start('SERIES')}
              variant="outline"
            >
              Match de Séries
            </Button>
          </div>
          {participantCount < 2 ? (
            <small>Convide pelo menos mais uma pessoa para começar.</small>
          ) : null}
        </div>
      )}
    </section>
  );
}
