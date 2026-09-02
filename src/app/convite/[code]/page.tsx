import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { joinRoomByInviteCode } from '@/services/community/community.service';

export default async function RoomInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect(`/entrar?next=/convite/${code}`);

  const result = await joinRoomByInviteCode(user.id, code).catch(() => null);
  if (!result) {
    return (
      <main className="session-renewal">
        <Image alt="" height={64} priority src="/brand/viue-symbol.png" width={64} />
        <p>Este convite é inválido ou não existe mais.</p>
        <Link href="/comunidade">Voltar para a comunidade</Link>
      </main>
    );
  }

  redirect(`/comunidade/salas/${result.roomId}`);
}
