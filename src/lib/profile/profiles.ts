import { BookOpen, Film, Gamepad2, type LucideIcon } from 'lucide-react';

export const PROFILE_SLUGS = ['filmes-series', 'games', 'livros'] as const;

export type ProfileSlug = (typeof PROFILE_SLUGS)[number];

export const DEFAULT_PROFILE_SLUG: ProfileSlug = 'filmes-series';

export type ProfileConfigEntry = {
  label: string;
  icon: LucideIcon;
  available: boolean;
};

export const PROFILE_CONFIG: Record<ProfileSlug, ProfileConfigEntry> = {
  'filmes-series': { label: 'Filmes e Séries', icon: Film, available: true },
  games: { label: 'Games', icon: Gamepad2, available: false },
  livros: { label: 'Livros', icon: BookOpen, available: false },
};

export function isProfileSlug(value: string): value is ProfileSlug {
  return (PROFILE_SLUGS as readonly string[]).includes(value);
}
