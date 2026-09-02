'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Film,
  Settings2,
  Star,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import type { FocusEvent } from 'react';
import { useEffect, useState } from 'react';

import { AppNavigation } from '@/components/layout/app-navigation';
import { Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';

type Person = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

type InviteCandidate = {
  id: string;
  name: string;
  email: string;
};

type Room = {
  id: string;
  name: string;
  description: string | null;
  matchMode: 'ALL_PARTICIPANTS' | 'ANY_PAIR';
  isOwner: boolean;
  owner: Person;
  participants: Person[];
  minimumRatings: number;
  inviteCode: string;
  inviteCandidates: InviteCandidate[];
  matches: {
    id: string;
    title: string;
    type: 'MOVIE' | 'SERIES';
    posterUrl: string | null;
    releaseYear: string | null;
    average: string;
    ratingCount: number;
  }[];
};

type ApiPayload = { success: true; data: Room } | { success: false; message?: string };

function PersonAvatar({ person }: { person: { name: string } }) {
  const initials = person.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className="community-avatar" aria-hidden="true">
      {initials}
    </span>
  );
}

function RoomInvitePanel({
  candidates,
  inviteCode,
  onInvited,
  roomId,
}: {
  candidates: InviteCandidate[];
  inviteCode: string;
  onInvited: (friend: InviteCandidate) => void;
  roomId: string;
}) {
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const inviteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/convite/${inviteCode}` : '';

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  async function handleInvite(friend: InviteCandidate) {
    setInvitingId(friend.id);
    try {
      const response = await authFetch(`/api/community/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: friend.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Não foi possível convidar.');
      }
      onInvited(friend);
      showToast({ title: `${friend.name} foi convidado.`, variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Não foi possível convidar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setInvitingId(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast({ title: 'Link copiado.', variant: 'success' });
    } catch {
      showToast({ title: 'Não foi possível copiar o link', variant: 'error' });
    }
  }

  return (
    <div className="room-invite" onBlur={handleBlur}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        leftIcon={<UserPlus aria-hidden="true" size={16} />}
        onClick={() => setIsOpen((current) => !current)}
        size="sm"
        variant="outline"
      >
        Convidar
      </Button>

      {isOpen ? (
        <div className="room-invite-panel" role="menu" aria-label="Convidar para a sala">
          <div className="room-invite-panel-section">
            <span className="room-invite-panel-label">Convidar amigos</span>
            {candidates.length > 0 ? (
              candidates.map((friend) => (
                <div className="room-invite-candidate" key={friend.id}>
                  <PersonAvatar person={friend} />
                  <div>
                    <strong>{friend.name}</strong>
                    <span>{friend.email}</span>
                  </div>
                  <Button
                    disabled={invitingId === friend.id}
                    isLoading={invitingId === friend.id}
                    onClick={() => void handleInvite(friend)}
                    role="menuitem"
                    size="sm"
                    variant="ghost"
                  >
                    Convidar
                  </Button>
                </div>
              ))
            ) : (
              <p className="room-invite-empty">Todos os seus amigos já estão nesta sala.</p>
            )}
          </div>

          <div className="room-invite-panel-section">
            <span className="room-invite-panel-label">Link de convite</span>
            <div className="room-invite-link-box">
              <input onFocus={(event) => event.target.select()} readOnly value={inviteUrl} />
              <Button
                leftIcon={<Copy aria-hidden="true" size={15} />}
                onClick={() => void handleCopyLink()}
                size="sm"
                variant="outline"
              >
                Copiar
              </Button>
            </div>
            <p className="room-invite-hint">Qualquer pessoa com conta pode entrar por este link.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoomScreen({ initialRoom }: { initialRoom: Room }) {
  const [room, setRoom] = useState(initialRoom);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;

    async function refreshRoom() {
      try {
        const response = await authFetch(`/api/community/rooms/${room.id}`);
        const payload = (await response.json()) as ApiPayload;
        if (!cancelled && response.ok && payload.success) {
          setRoom(payload.data);
        }
      } catch {
        // mantém os dados exibidos; a próxima revalidação tenta de novo
      }
    }

    function handleVisible() {
      if (document.visibilityState === 'visible') void refreshRoom();
    }

    // Ao voltar para a sala (ex.: depois de avaliar um título em /titulo/[id] e
    // apertar "voltar"), o Next reaproveita o payload em cache da navegação
    // anterior e este componente remonta com a média antiga — por isso buscamos
    // os dados frescos assim que a tela monta, além de ao reganhar foco.
    void refreshRoom();
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [room.id]);

  async function updateMode(matchMode: Room['matchMode']) {
    if (matchMode === room.matchMode) return;
    setIsSaving(true);
    try {
      const response = await authFetch(`/api/community/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchMode }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Não foi possível salvar.' : payload.message);
      }
      setRoom(payload.data);
      showToast({ title: 'Regra da sala atualizada', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Não foi possível atualizar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="home-app">
      <AppNavigation />
      <div className="home-workspace">
        <main className="room-page">
          <Link className="catalog-back" href="/comunidade">
            <ArrowLeft aria-hidden="true" size={18} /> Voltar para comunidade
          </Link>

          <header className="room-header">
            <div className="room-symbol">
              <UsersRound aria-hidden="true" size={28} />
            </div>
            <div>
              <span className="home-kicker">Sala de {room.owner.name}</span>
              <h1>{room.name}</h1>
              <p>{room.description || 'Os títulos que conectam as avaliações deste grupo.'}</p>
            </div>
          </header>

          <div className="room-layout">
            <aside className="room-sidebar-panel">
              <section aria-labelledby="participants-title">
                <div className="room-panel-heading">
                  <h2 id="participants-title">Participantes</h2>
                  <div className="room-panel-heading-actions">
                    <span>{room.participants.length}</span>
                    <RoomInvitePanel
                      candidates={room.inviteCandidates}
                      inviteCode={room.inviteCode}
                      onInvited={(friend) =>
                        setRoom((current) => ({
                          ...current,
                          inviteCandidates: current.inviteCandidates.filter(
                            (candidate) => candidate.id !== friend.id,
                          ),
                          participants: [
                            ...current.participants,
                            { ...friend, avatar_url: null },
                          ],
                        }))
                      }
                      roomId={room.id}
                    />
                  </div>
                </div>
                <div className="room-participants">
                  {room.participants.map((person) => (
                    <div className="room-participant" key={person.id}>
                      <PersonAvatar person={person} />
                      <div>
                        <strong>{person.name}</strong>
                        <span>{person.email}</span>
                      </div>
                      {person.id === room.owner.id ? (
                        <Crown aria-label="Administrador" size={16} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="room-rule" aria-labelledby="room-rule-title">
                <div className="room-panel-heading">
                  <h2 id="room-rule-title">Regra da sala</h2>
                  <Settings2 aria-hidden="true" size={18} />
                </div>
                {room.isOwner ? (
                  <div className="room-rule-options">
                    <button
                      aria-pressed={room.matchMode === 'ALL_PARTICIPANTS'}
                      disabled={isSaving}
                      onClick={() => updateMode('ALL_PARTICIPANTS')}
                      type="button"
                    >
                      <span>
                        {room.matchMode === 'ALL_PARTICIPANTS' ? <Check size={16} /> : null}
                      </span>
                      <div>
                        <strong>Todos avaliaram</strong>
                        <small>Exige {room.participants.length} notas</small>
                      </div>
                    </button>
                    <button
                      aria-pressed={room.matchMode === 'ANY_PAIR'}
                      disabled={isSaving}
                      onClick={() => updateMode('ANY_PAIR')}
                      type="button"
                    >
                      <span>{room.matchMode === 'ANY_PAIR' ? <Check size={16} /> : null}</span>
                      <div>
                        <strong>Pelo menos 2</strong>
                        <small>Libera após duas notas</small>
                      </div>
                    </button>
                  </div>
                ) : (
                  <p>
                    {room.matchMode === 'ALL_PARTICIPANTS'
                      ? 'O título aparece quando todos avaliam.'
                      : 'O título aparece após duas avaliações.'}
                  </p>
                )}
              </section>
            </aside>

            <section className="room-matches" aria-labelledby="matches-title">
              <div className="room-matches-heading">
                <div>
                  <span className="home-kicker">Histórico em comum</span>
                  <h2 id="matches-title">Títulos avaliados pelo grupo</h2>
                </div>
                <span>
                  {room.minimumRatings}{' '}
                  {room.minimumRatings === 1 ? 'nota necessária' : 'notas necessárias'}
                </span>
              </div>
              {room.matches.length > 0 ? (
                <div className="room-match-grid" role="list">
                  {room.matches.map((match) => (
                    <Link
                      className="room-match-card"
                      href={`/titulo/${match.id}`}
                      key={match.id}
                      role="listitem"
                    >
                      <div className="room-match-poster">
                        {match.posterUrl ? (
                          <Image
                            alt={`Poster de ${match.title}`}
                            fill
                            sizes="(max-width: 640px) 44vw, 180px"
                            src={match.posterUrl}
                          />
                        ) : (
                          <Film aria-hidden="true" size={26} />
                        )}
                        <span>
                          <Star aria-hidden="true" fill="currentColor" size={15} /> {match.average}
                        </span>
                      </div>
                      <h3>{match.title}</h3>
                      <p>
                        {match.type === 'MOVIE' ? 'Filme' : 'Série'}
                        {match.releaseYear ? ` · ${match.releaseYear}` : ''}
                      </p>
                      <small>
                        {match.ratingCount}{' '}
                        {match.ratingCount === 1 ? 'pessoa avaliou' : 'pessoas avaliaram'}
                      </small>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="community-empty-state room-empty">
                  <Film aria-hidden="true" size={30} />
                  <h3>Ainda não há títulos em comum</h3>
                  <p>Quando avaliações suficientes coincidirem, a média do grupo aparecerá aqui.</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
