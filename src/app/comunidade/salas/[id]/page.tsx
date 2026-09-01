import { redirect } from 'next/navigation';

import { RoomScreen } from '@/components/community/room-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getRoomDetail } from '@/services/community/community.service';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const { id } = await params;
  const room = await getRoomDetail(user.id, id).catch(() => null);
  if (!room) redirect('/comunidade');
  return <RoomScreen initialRoom={room} />;
}
