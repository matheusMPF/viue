'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Film, Settings2, Star, UsersRound } from 'lucide-react';
import { useState } from 'react';

import { AppNavigation } from '@/components/layout/app-navigation';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';

type Person = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
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

function PersonAvatar({ person }: { person: Person }) {
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

export function RoomScreen({ initialRoom }: { initialRoom: Room }) {
  const [room, setRoom] = useState(initialRoom);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

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
                  <span>{room.participants.length}</span>
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
