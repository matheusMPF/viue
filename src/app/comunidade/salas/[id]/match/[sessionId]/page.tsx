import { ArrowLeft, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RoomMatch } from '@/components/community/room-match';
import { AppNavigation } from '@/components/layout/app-navigation';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { DEFAULT_PROFILE_SLUG } from '@/lib/profile/profiles';
import { getRoomDetail } from '@/services/community/community.service';
import { getMatchSession } from '@/services/community/match.service';

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const { id, sessionId } = await params;
  const [room, session] = await Promise.all([
    getRoomDetail(user.id, id).catch(() => null),
    getMatchSession(user.id, id, sessionId).catch(() => null),
  ]);
  if (!room) redirect('/comunidade');
  if (!session) redirect(`/comunidade/salas/${id}`);

  return (
    <div className="home-app">
      <AppNavigation profile={DEFAULT_PROFILE_SLUG} />
      <div className="home-workspace">
        <main className="room-page match-page">
          <Link className="catalog-back" href={`/comunidade/salas/${id}`}>
            <ArrowLeft aria-hidden="true" size={18} /> Voltar para {room.name}
          </Link>

          <header className="room-header match-page-header">
            <div className="room-symbol">
              <Clapperboard aria-hidden="true" size={28} />
            </div>
            <div>
              <span className="home-kicker">
                Sessão com {session.participantCount} participantes
              </span>
              <h1>Escolham juntos</h1>
              <p>Todos recebem o mesmo título. Cada etapa avança quando o grupo inteiro votar.</p>
            </div>
          </header>

          <RoomMatch initialSession={session} roomId={id} />
        </main>
      </div>
    </div>
  );
}
