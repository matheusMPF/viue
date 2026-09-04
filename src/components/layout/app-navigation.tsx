'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, Home, LogOut, UsersRound } from 'lucide-react';

import { Button } from '@/components/ui';
import { useLogout } from '@/hooks/use-logout';
import type { ProfileSlug } from '@/lib/profile/profiles';
import { ProfileSwitcher } from '@/components/profile/profile-switcher';

function getNavigationItems(profile: ProfileSlug) {
  return [
    { href: `/${profile}`, label: 'Início', icon: Home },
    { href: `/${profile}/descobrir`, label: 'Descobrir', icon: Compass },
    { href: `/${profile}/minha-lista`, label: 'Minha lista', icon: Bookmark },
    { href: '/comunidade', label: 'Comunidade', icon: UsersRound },
  ] as const;
}

function NavigationLinks({ mobile = false, profile }: { mobile?: boolean; profile: ProfileSlug }) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems(profile);

  return navigationItems.map((item) => {
    const Icon = item.icon;
    const isActive =
      item.href === '/comunidade' ? pathname.startsWith(item.href) : pathname === item.href;
    return (
      <Link
        aria-current={isActive ? 'page' : undefined}
        className={isActive ? 'is-active' : undefined}
        href={item.href}
        key={item.href}
      >
        <Icon aria-hidden="true" size={mobile ? 21 : 20} /> <span>{item.label}</span>
      </Link>
    );
  });
}

export function AppNavigation({ profile }: { profile: ProfileSlug }) {
  const { isLoggingOut, logout } = useLogout();

  return (
    <>
      <aside className="home-sidebar" aria-label="Navegação principal">
        <Link className="home-brand" href={`/${profile}`} aria-label="Viuê - início">
          <Image alt="" height={46} priority src="/brand/viue-symbol.png" width={46} />
        </Link>
        <nav>
          <NavigationLinks profile={profile} />
        </nav>
        <ProfileSwitcher profile={profile} />
        <Button
          aria-label="Sair da conta"
          className="home-logout"
          isLoading={isLoggingOut}
          leftIcon={<LogOut aria-hidden="true" size={18} />}
          onClick={logout}
          variant="ghost"
        >
          Sair
        </Button>
      </aside>
      <nav className="home-bottom-nav" aria-label="Navegação principal mobile">
        <NavigationLinks mobile profile={profile} />
        <ProfileSwitcher profile={profile} variant="bottom-nav" />
      </nav>
    </>
  );
}
