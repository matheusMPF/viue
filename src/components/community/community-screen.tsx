'use client';

import Link from 'next/link';
import {
  Check,
  DoorOpen,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AppNavigation } from '@/components/layout/app-navigation';
import { Button, ConfirmDialog, Input, Modal, Tabs } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth/auth-fetch';
import { DEFAULT_PROFILE_SLUG } from '@/lib/profile/profiles';

type Person = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

type CommunityOverview = {
  friends: (Person & { friendshipId: string })[];
  incomingRequests: (Person & { friendshipId: string })[];
  suggestions: Person[];
  rooms: {
    id: string;
    name: string;
    description: string | null;
    matchMode: 'ALL_PARTICIPANTS' | 'ANY_PAIR';
    owner: Person;
    participantCount: number;
    isOwner: boolean;
  }[];
};

type ApiPayload<T> = { success: true; data: T } | { success: false; message?: string };

function Initials({ name }: { name: string }) {
  const initials = name
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

export function CommunityScreen({ initialOverview }: { initialOverview: CommunityOverview }) {
  const showToast = useToast();
  const [overview, setOverview] = useState(initialOverview);
  const [search, setSearch] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<(Person & { friendshipId: string }) | null>(
    null,
  );
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<'ALL_PARTICIPANTS' | 'ANY_PAIR'>('ALL_PARTICIPANTS');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);

  async function fetchOverview(searchValue = '') {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    const response = await authFetch(`/api/community?${params.toString()}`);
    const payload = (await response.json()) as ApiPayload<CommunityOverview>;
    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? 'Não foi possível atualizar.' : payload.message);
    }
    return payload.data;
  }

  async function loadOverview(searchValue = '') {
    setOverview(await fetchOverview(searchValue));
  }

  async function searchPeople(searchValue: string) {
    const query = searchValue.trim();
    const requestId = ++searchRequestRef.current;
    setIsSearching(true);

    try {
      const data = await fetchOverview(query);
      if (requestId !== searchRequestRef.current) return;
      setOverview(data);
      setSearchedQuery(query);
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      showToast({
        title: 'Busca indisponível',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
    }
  }

  function handleSearchChange(value: string) {
    searchRequestRef.current += 1;
    setSearch(value);
    setSearchedQuery('');
    setOverview((current) => ({ ...current, suggestions: [] }));

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const query = value.trim();
    if (!query) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => void searchPeople(query), 300);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (search.trim()) void searchPeople(search);
  }

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchRequestRef.current += 1;
    },
    [],
  );

  async function requestFriend(personId: string) {
    setBusyId(personId);
    try {
      const response = await authFetch('/api/community/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeId: personId }),
      });
      const payload = (await response.json()) as ApiPayload<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Não foi possível enviar.' : payload.message);
      }
      await loadOverview(search.trim());
      showToast({ title: 'Solicitação enviada', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Não foi possível adicionar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function respond(friendshipId: string, status: 'ACCEPTED' | 'REJECTED') {
    setBusyId(friendshipId);
    try {
      const response = await authFetch(`/api/community/friends/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as ApiPayload<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Não foi possível responder.' : payload.message);
      }
      await loadOverview();
      showToast({
        title: status === 'ACCEPTED' ? 'Amizade aceita' : 'Solicitação recusada',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Não foi possível responder',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function removeFriendship(friendshipId: string, friendId: string) {
    setBusyId(friendshipId);
    try {
      const response = await authFetch(`/api/community/friends/${friendshipId}`, {
        method: 'DELETE',
      });
      const payload = (await response.json()) as ApiPayload<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Não foi possível remover.' : payload.message);
      }
      setSelectedFriends((current) => current.filter((id) => id !== friendId));
      await loadOverview();
      setFriendToRemove(null);
      showToast({ title: 'Amizade removida', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Não foi possível remover',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  }

  function toggleFriend(friendId: string) {
    setSelectedFriends((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
  }

  function resetRoomForm() {
    setRoomName('');
    setRoomDescription('');
    setSelectedFriends([]);
    setMatchMode('ALL_PARTICIPANTS');
  }

  function handleCreateRoomOpenChange(open: boolean) {
    if (isCreatingRoom) return;
    setIsCreateRoomOpen(open);
    if (!open) resetRoomForm();
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingRoom(true);
    try {
      const response = await authFetch('/api/community/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          description: roomDescription || undefined,
          friendIds: selectedFriends,
          matchMode,
        }),
      });
      const payload = (await response.json()) as ApiPayload<{ id: string }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Não foi possível criar.' : payload.message);
      }
      await loadOverview();
      resetRoomForm();
      setIsCreateRoomOpen(false);
      showToast({ title: 'Sala criada', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Não foi possível criar a sala',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setIsCreatingRoom(false);
    }
  }

  const friendsPanel = (
    <div className="community-stack">
      {overview.incomingRequests.length > 0 ? (
        <section className="community-section" aria-labelledby="requests-title">
          <div className="community-section-heading">
            <div>
              <span className="home-kicker">Aguardando você</span>
              <h2 id="requests-title">Solicitações recebidas</h2>
            </div>
            <span className="community-count">{overview.incomingRequests.length}</span>
          </div>
          <div className="community-people-list">
            {overview.incomingRequests.map((person) => (
              <article className="community-person" key={person.friendshipId}>
                <Initials name={person.name} />
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.email}</span>
                </div>
                <div className="community-person-actions">
                  <Button
                    aria-label={`Aceitar solicitação de ${person.name}`}
                    disabled={busyId === person.friendshipId}
                    onClick={() => respond(person.friendshipId, 'ACCEPTED')}
                    size="sm"
                  >
                    <Check aria-hidden="true" size={17} /> Aceitar
                  </Button>
                  <Button
                    aria-label={`Recusar solicitação de ${person.name}`}
                    disabled={busyId === person.friendshipId}
                    onClick={() => respond(person.friendshipId, 'REJECTED')}
                    size="sm"
                    variant="ghost"
                  >
                    <X aria-hidden="true" size={17} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="community-section" aria-labelledby="friends-title">
        <div className="community-section-heading">
          <div>
            <span className="home-kicker">Sua comunidade</span>
            <h2 id="friends-title">Amigos</h2>
          </div>
          <span className="community-count">{overview.friends.length}</span>
        </div>
        <form className="community-search" onSubmit={handleSearch} role="search">
          <Input
            aria-label="Buscar pessoas por nome ou e-mail"
            leftElement={<Search aria-hidden="true" size={18} />}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Nome ou e-mail"
            rightElement={
              isSearching ? (
                <LoaderCircle aria-label="Buscando pessoas" className="animate-spin" size={17} />
              ) : null
            }
            type="search"
            value={search}
          />
        </form>

        {search.trim() ? (
          overview.suggestions.length > 0 ? (
            <div className="community-people-list" aria-label="Resultados da busca">
              {overview.suggestions.map((person) => (
                <article className="community-person" key={person.id}>
                  <Initials name={person.name} />
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.email}</span>
                  </div>
                  <Button
                    disabled={busyId === person.id}
                    onClick={() => requestFriend(person.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <UserPlus aria-hidden="true" size={17} /> Adicionar
                  </Button>
                </article>
              ))}
            </div>
          ) : searchedQuery && searchedQuery === search.trim() && !isSearching ? (
            <p className="community-empty">Nenhuma pessoa disponível para essa busca.</p>
          ) : null
        ) : overview.friends.length > 0 ? (
          <div className="community-friend-grid">
            {overview.friends.map((friend) => (
              <article className="community-friend" key={friend.id}>
                <Initials name={friend.name} />
                <div>
                  <strong>{friend.name}</strong>
                  <span>{friend.email}</span>
                </div>
                <Button
                  aria-label={`Remover ${friend.name} dos amigos`}
                  className="community-friend-remove"
                  onClick={() => setFriendToRemove(friend)}
                  size="icon"
                  variant="ghost"
                >
                  <UserMinus aria-hidden="true" size={16} />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="community-empty-state">
            <UsersRound aria-hidden="true" size={28} />
            <p>Busque pessoas para começar sua comunidade.</p>
          </div>
        )}
      </section>
    </div>
  );

  const roomsPanel = (
    <div className="community-rooms-view">
      <section className="community-rooms community-rooms-clean" aria-labelledby="rooms-title">
        <div className="community-rooms-toolbar">
          <div>
            <span className="home-kicker">Seus grupos</span>
            <div className="community-rooms-title-row">
              <h2 id="rooms-title">Salas</h2>
              <span className="community-count">{overview.rooms.length}</span>
            </div>
            <p>Entre em uma sala existente ou reúna seus amigos em um novo grupo.</p>
          </div>
          <Button
            leftIcon={<Plus aria-hidden="true" size={18} />}
            onClick={() => setIsCreateRoomOpen(true)}
          >
            Criar sala
          </Button>
        </div>

        {overview.rooms.length > 0 ? (
          <div className="community-room-list">
            {overview.rooms.map((room) => (
              <Link
                className="community-room-card"
                href={`/comunidade/salas/${room.id}`}
                key={room.id}
              >
                <div className="community-room-icon">
                  <UsersRound aria-hidden="true" size={22} />
                </div>
                <div>
                  <h3>{room.name}</h3>
                  <p>{room.description || `Sala de ${room.owner.name}`}</p>
                  <span>
                    {room.participantCount}{' '}
                    {room.participantCount === 1 ? 'participante' : 'participantes'} ·{' '}
                    {room.matchMode === 'ALL_PARTICIPANTS' ? 'todos avaliam' : 'mínimo de 2'}
                  </span>
                </div>
                {room.isOwner ? <small>ADM</small> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="community-empty-state community-rooms-empty">
            <DoorOpen aria-hidden="true" size={28} />
            <div>
              <h3>Nenhuma sala por enquanto</h3>
              <p>Crie um grupo para começar a encontrar títulos em comum.</p>
            </div>
            <Button
              leftIcon={<Plus aria-hidden="true" size={17} />}
              onClick={() => setIsCreateRoomOpen(true)}
              variant="outline"
            >
              Criar primeira sala
            </Button>
          </div>
        )}
      </section>

      <Modal.Root
        closeOnOverlayClick={!isCreatingRoom}
        onOpenChange={handleCreateRoomOpenChange}
        open={isCreateRoomOpen}
      >
        <Modal.Header>
          <div className="community-modal-heading">
            <Modal.Title>Criar sala</Modal.Title>
            <Modal.Description>
              Reúna seus amigos para descobrir o próximo título do grupo.
            </Modal.Description>
          </div>
          <Modal.CloseButton />
        </Modal.Header>

        <form className="community-room-modal-form" onSubmit={createRoom}>
          <Modal.Body className="community-room-modal-body">
            <Input
              autoFocus
              label="Nome da sala"
              maxLength={150}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Ex.: Cinema de sexta"
              required
              value={roomName}
            />

            <div className="community-textarea-field">
              <label className="community-textarea-label" htmlFor="room-description">
                Descrição <span>(opcional)</span>
              </label>
              <textarea
                id="room-description"
                maxLength={500}
                onChange={(event) => setRoomDescription(event.target.value)}
                placeholder="Ex.: clássicos para assistir no fim de semana"
                value={roomDescription}
              />
            </div>

            <fieldset className="community-friend-selector">
              <legend>
                Convidar amigos <span>(opcional)</span>
              </legend>
              {overview.friends.length > 0 ? (
                overview.friends.map((friend) => (
                  <label key={friend.id}>
                    <input
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => toggleFriend(friend.id)}
                      type="checkbox"
                    />
                    <Initials name={friend.name} />
                    <span>{friend.name}</span>
                  </label>
                ))
              ) : (
                <p>Você pode criar a sala agora e convidar pessoas depois.</p>
              )}
            </fieldset>

            <details className="community-room-settings">
              <summary>
                <Settings2 aria-hidden="true" size={18} />
                <span>
                  <strong>Regra do match</strong>
                  <small>
                    {matchMode === 'ALL_PARTICIPANTS'
                      ? 'Todos precisam avaliar'
                      : 'Duas avaliações são suficientes'}
                  </small>
                </span>
              </summary>
              <fieldset className="community-rule-options">
                <legend>Quando um título entra na sala?</legend>
                <label>
                  <input
                    checked={matchMode === 'ALL_PARTICIPANTS'}
                    name="match-mode"
                    onChange={() => setMatchMode('ALL_PARTICIPANTS')}
                    type="radio"
                  />
                  <span>
                    <strong>Todos avaliaram</strong>
                    <small>Melhor para encontrar gostos realmente em comum.</small>
                  </span>
                </label>
                <label>
                  <input
                    checked={matchMode === 'ANY_PAIR'}
                    name="match-mode"
                    onChange={() => setMatchMode('ANY_PAIR')}
                    type="radio"
                  />
                  <span>
                    <strong>Pelo menos 2 avaliaram</strong>
                    <small>O título aparece assim que duas pessoas derem uma nota.</small>
                  </span>
                </label>
              </fieldset>
            </details>
          </Modal.Body>

          <Modal.Footer className="community-room-modal-footer">
            <Button
              disabled={isCreatingRoom}
              onClick={() => handleCreateRoomOpenChange(false)}
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              isLoading={isCreatingRoom}
              leftIcon={<DoorOpen aria-hidden="true" size={18} />}
              type="submit"
            >
              Criar sala
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Root>
    </div>
  );

  return (
    <div className="home-app">
      <AppNavigation profile={DEFAULT_PROFILE_SLUG} />
      <div className="home-workspace">
        <main className="community-page">
          <header className="community-hero">
            <span className="home-kicker">Viuê em comunidade</span>
            <h1>Comunidade</h1>
            <p>Encontre amigos, organize suas salas e escolha o que assistir em grupo.</p>
          </header>
          <Tabs
            ariaLabel="Áreas da comunidade"
            items={[
              {
                content: friendsPanel,
                icon: <UsersRound aria-hidden="true" size={18} />,
                label: (
                  <span className="community-tab-label">
                    Amigos <span>{overview.friends.length}</span>
                  </span>
                ),
                value: 'friends',
              },
              {
                content: roomsPanel,
                icon: <DoorOpen aria-hidden="true" size={18} />,
                label: (
                  <span className="community-tab-label">
                    Salas <span>{overview.rooms.length}</span>
                  </span>
                ),
                value: 'rooms',
              },
            ]}
          />
        </main>
      </div>

      <ConfirmDialog
        confirmLabel="Remover amigo"
        confirmVariant="danger"
        description={
          friendToRemove
            ? `${friendToRemove.name} será removido da sua lista de amigos.`
            : 'Esta amizade será removida.'
        }
        isConfirming={friendToRemove ? busyId === friendToRemove.friendshipId : false}
        onConfirm={() => {
          if (friendToRemove) {
            void removeFriendship(friendToRemove.friendshipId, friendToRemove.id);
          }
        }}
        onOpenChange={(open) => {
          if (!open && busyId !== friendToRemove?.friendshipId) setFriendToRemove(null);
        }}
        open={friendToRemove !== null}
        title="Remover amizade?"
      />
    </div>
  );
}
