export const MATCH_SESSION_IDLE_TIMEOUT_MS = 20 * 60 * 1_000;

export function getMatchSessionIdleCutoff(now = new Date()) {
  return new Date(now.getTime() - MATCH_SESSION_IDLE_TIMEOUT_MS);
}

export function isMatchSessionInactive(lastActivityAt: Date, now = new Date()) {
  return lastActivityAt <= getMatchSessionIdleCutoff(now);
}
