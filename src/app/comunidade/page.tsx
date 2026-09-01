import { redirect } from 'next/navigation';

import { CommunityScreen } from '@/components/community/community-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getCommunityOverview } from '@/services/community/community.service';

export default async function CommunityPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const overview = await getCommunityOverview(user.id);
  return <CommunityScreen initialOverview={overview} />;
}
