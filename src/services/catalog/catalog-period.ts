export const MONTHLY_EDITORIAL_CATALOG_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

const FIRST_MOVIE_YEAR = 1888;

export function getCurrentCatalogYear(now = new Date()) {
  return now.getUTCFullYear();
}

export function parseCatalogYear(value: string | null | undefined, now = new Date()) {
  if (!value) return undefined;

  const year = Number(value);
  const currentYear = getCurrentCatalogYear(now);

  return Number.isInteger(year) && year >= FIRST_MOVIE_YEAR && year <= currentYear
    ? year
    : undefined;
}
