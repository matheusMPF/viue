import { notFound, redirect } from 'next/navigation';

import { ContentDetailScreen } from '@/components/catalog/content-detail-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getContentDetail } from '@/services/catalog/content-detail.service';

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const { id } = await params;
  const content = await getContentDetail(id, user.id);
  if (!content) notFound();

  return <ContentDetailScreen initialContent={content} />;
}
