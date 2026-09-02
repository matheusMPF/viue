'use client';

import Link from 'next/link';
import { LogOut, UserRound } from 'lucide-react';
import type { FocusEvent } from 'react';
import { useState } from 'react';

import { useLogout } from '@/hooks/use-logout';
import type { PublicUser } from '@/types/auth';

export function UserMenu({ user }: { user: PublicUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggingOut, logout } = useLogout();

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  return (
    <div className="user-menu" onBlur={handleBlur}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menu de ${user.name}`}
        className="home-avatar"
        onClick={() => setIsOpen((current) => !current)}
        title={user.name}
        type="button"
      >
        {initials}
      </button>

      {isOpen ? (
        <div className="user-menu-panel" role="menu" aria-label={`Menu de ${user.name}`}>
          <span className="user-menu-name">{user.name}</span>
          <Link
            className="user-menu-item"
            href="/conta"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            <UserRound aria-hidden="true" size={17} /> Minha conta
          </Link>
          <button
            className="user-menu-item is-danger"
            disabled={isLoggingOut}
            onClick={() => void logout()}
            role="menuitem"
            type="button"
          >
            <LogOut aria-hidden="true" size={17} /> Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
