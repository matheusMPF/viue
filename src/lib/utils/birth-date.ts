const MIN_YEAR = 1900;

/**
 * Progressively masks free-form digit input into a DD/MM/AAAA display string,
 * inserting separators as the user types.
 */
export function maskBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
}

/**
 * Parses a complete DD/MM/AAAA display string into an ISO (YYYY-MM-DD) date,
 * rejecting calendar-invalid, future, or unreasonably old dates.
 */
export function parseBirthDateInput(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match as unknown as [string, string, string, string];
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(year, month - 1, day);
  const isCalendarValid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isCalendarValid) return null;
  if (year < MIN_YEAR || date > new Date()) return null;

  return `${yearText}-${monthText}-${dayText}`;
}

/** Formats an ISO (YYYY-MM-DD) date into a DD/MM/AAAA display string. */
export function formatBirthDateForDisplay(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
