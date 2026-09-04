'use client';

import Link from 'next/link';
import { ChevronsUpDown } from 'lucide-react';
import type { FocusEvent } from 'react';
import { useState } from 'react';

import { PROFILE_CONFIG, PROFILE_SLUGS, type ProfileSlug } from '@/lib/profile/profiles';

export function ProfileSwitcher({
  profile,
  variant = 'sidebar',
}: {
  profile: ProfileSlug;
  variant?: 'sidebar' | 'bottom-nav';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeConfig = PROFILE_CONFIG[profile];
  const ActiveIcon = activeConfig.icon;

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  return (
    <div className={`profile-switcher is-${variant}`} onBlur={handleBlur}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Perfil ativo: ${activeConfig.label}. Trocar perfil`}
        className="profile-switcher-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <ActiveIcon aria-hidden="true" size={variant === 'bottom-nav' ? 21 : 18} />
        <span>{variant === 'bottom-nav' ? 'Perfil' : activeConfig.label}</span>
        {variant === 'sidebar' ? <ChevronsUpDown aria-hidden="true" size={15} /> : null}
      </button>

      {isOpen ? (
        <div className="profile-switcher-panel" role="menu" aria-label="Trocar perfil">
          {PROFILE_SLUGS.map((slug) => {
            const config = PROFILE_CONFIG[slug];
            const Icon = config.icon;
            const isActive = slug === profile;

            return config.available ? (
              <Link
                aria-current={isActive ? 'true' : undefined}
                className={`profile-switcher-item${isActive ? ' is-active' : ''}`}
                href={`/${slug}`}
                key={slug}
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                <Icon aria-hidden="true" size={18} />
                <span>{config.label}</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="profile-switcher-item is-disabled"
                key={slug}
                role="menuitem"
              >
                <Icon aria-hidden="true" size={18} />
                <span className="profile-switcher-item-copy">
                  <strong>{config.label}</strong>
                  <small>Em breve</small>
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
