import { redirect } from 'next/navigation';

import { DEFAULT_PROFILE_SLUG } from '@/lib/profile/profiles';

export default function RootPage() {
  redirect(`/${DEFAULT_PROFILE_SLUG}`);
}
