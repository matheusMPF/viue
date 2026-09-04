import { describe, expect, it } from 'vitest';

import { DEFAULT_PROFILE_SLUG, isProfileSlug, PROFILE_CONFIG, PROFILE_SLUGS } from './profiles';

describe('isProfileSlug', () => {
  it('accepts the 3 known slugs', () => {
    for (const slug of PROFILE_SLUGS) {
      expect(isProfileSlug(slug)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isProfileSlug('musicas')).toBe(false);
    expect(isProfileSlug('')).toBe(false);
    expect(isProfileSlug('Games')).toBe(false);
  });
});

describe('PROFILE_CONFIG', () => {
  it('only the default profile is available in this phase', () => {
    expect(PROFILE_CONFIG[DEFAULT_PROFILE_SLUG].available).toBe(true);
    expect(PROFILE_CONFIG.games.available).toBe(false);
    expect(PROFILE_CONFIG.livros.available).toBe(false);
  });
});
