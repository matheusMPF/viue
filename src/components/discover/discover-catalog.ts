import type { CatalogMovie } from '@/services/tmdb/tmdb.types';

export function mergeUniqueCatalogItems(
  ...catalogs: readonly (readonly CatalogMovie[])[]
): CatalogMovie[] {
  const seenIds = new Set<string>();
  const uniqueItems: CatalogMovie[] = [];

  for (const catalog of catalogs) {
    for (const item of catalog) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

export function interleaveCatalogItems(
  movies: readonly CatalogMovie[],
  series: readonly CatalogMovie[],
): CatalogMovie[] {
  const merged: CatalogMovie[] = [];
  const seenIds = new Set<string>();
  const maxLength = Math.max(movies.length, series.length);

  function appendUnique(item: CatalogMovie | undefined) {
    if (!item || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    merged.push(item);
  }

  for (let index = 0; index < maxLength; index += 1) {
    appendUnique(movies[index]);
    appendUnique(series[index]);
  }

  return merged;
}
