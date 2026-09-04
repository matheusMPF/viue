import type { ReactNode } from 'react';

import { AppNavigation } from '@/components/layout/app-navigation';
import { DEFAULT_PROFILE_SLUG, isProfileSlug } from '@/lib/profile/profiles';

export default async function ProfileWithNavLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;

  return (
    <div className="home-app">
      <AppNavigation profile={isProfileSlug(profile) ? profile : DEFAULT_PROFILE_SLUG} />
      {children}
    </div>
  );
}
