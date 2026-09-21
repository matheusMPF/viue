import { describe, expect, it } from 'vitest';

import {
  getCurrentCatalogYear,
  MONTHLY_EDITORIAL_CATALOG_REVALIDATE_SECONDS,
  parseCatalogYear,
} from './catalog-period';

describe('catalogPeriod', () => {
  it('mantem os rankings editoriais por trinta dias', () => {
    expect(MONTHLY_EDITORIAL_CATALOG_REVALIDATE_SECONDS).toBe(2_592_000);
  });

  it('acompanha automaticamente a virada do ano', () => {
    expect(getCurrentCatalogYear(new Date('2026-12-31T23:59:59.999Z'))).toBe(2026);
    expect(getCurrentCatalogYear(new Date('2027-01-01T00:00:00.000Z'))).toBe(2027);
  });

  it('aceita anos validos ate o ano atual', () => {
    const now = new Date('2027-06-01T00:00:00.000Z');

    expect(parseCatalogYear('2026', now)).toBe(2026);
    expect(parseCatalogYear('2027', now)).toBe(2027);
  });

  it('ignora anos invalidos ou futuros', () => {
    const now = new Date('2027-06-01T00:00:00.000Z');

    expect(parseCatalogYear('2028', now)).toBeUndefined();
    expect(parseCatalogYear('invalido', now)).toBeUndefined();
  });
});
