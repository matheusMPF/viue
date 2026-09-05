import { describe, expect, it } from 'vitest';

import {
  getMatchSessionIdleCutoff,
  isMatchSessionInactive,
  MATCH_SESSION_IDLE_TIMEOUT_MS,
} from './community-lifecycle';

describe('community lifecycle', () => {
  const now = new Date('2026-09-05T20:00:00.000Z');

  it('define o limite de inatividade em 20 minutos', () => {
    expect(MATCH_SESSION_IDLE_TIMEOUT_MS).toBe(20 * 60 * 1_000);
    expect(getMatchSessionIdleCutoff(now).toISOString()).toBe('2026-09-05T19:40:00.000Z');
  });

  it('encerra ao completar 20 minutos sem atividade', () => {
    expect(isMatchSessionInactive(new Date('2026-09-05T19:40:00.000Z'), now)).toBe(true);
    expect(isMatchSessionInactive(new Date('2026-09-05T19:40:00.001Z'), now)).toBe(false);
  });
});
