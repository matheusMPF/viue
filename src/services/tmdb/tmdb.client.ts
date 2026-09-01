import type {
  TmdbGenreResponse,
  TmdbMovieSearchResponse,
  TmdbTvSearchResponse,
} from './tmdb.types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

type TmdbRequestOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  revalidate?: number;
};

export class TmdbError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

function getTmdbToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new TmdbError('TMDB_READ_ACCESS_TOKEN nao configurado.', 500);
  return token;
}

function getTmdbLocale() {
  return {
    language: process.env.TMDB_LANGUAGE || 'pt-BR',
    region: process.env.TMDB_REGION || 'BR',
  };
}

async function tmdbRequest<T>(path: string, options: TmdbRequestOptions = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  const locale = getTmdbLocale();
  const params = {
    language: locale.language,
    region: locale.region,
    ...options.params,
  };

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${getTmdbToken()}`,
    },
    next: { revalidate: options.revalidate ?? 60 * 60 },
  });

  if (!response.ok) {
    throw new TmdbError(`TMDb respondeu com status ${response.status}.`, response.status);
  }

  return response.json() as Promise<T>;
}

export function getTmdbImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'w500') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function searchTmdbMovies(query: string, page = 1) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return tmdbRequest<TmdbMovieSearchResponse>('/movie/popular', {
      params: { page },
      revalidate: 60 * 30,
    });
  }

  return tmdbRequest<TmdbMovieSearchResponse>('/search/movie', {
    params: {
      include_adult: false,
      page,
      query: trimmedQuery,
    },
    revalidate: 60 * 15,
  });
}

export function discoverTopRatedTmdbMovies(page = 1, year?: number) {
  return tmdbRequest<TmdbMovieSearchResponse>('/discover/movie', {
    params: {
      include_adult: false,
      include_video: false,
      page,
      primary_release_year: year,
      sort_by: 'vote_average.desc',
      'vote_count.gte': year ? 50 : 500,
    },
    revalidate: 60 * 60,
  });
}

export function discoverTmdbMovies(page = 1, genreId?: number) {
  return tmdbRequest<TmdbMovieSearchResponse>('/discover/movie', {
    params: {
      include_adult: false,
      include_video: false,
      page,
      sort_by: 'popularity.desc',
      with_genres: genreId,
    },
    revalidate: 60 * 30,
  });
}

export function getTmdbMovieGenres() {
  return tmdbRequest<TmdbGenreResponse>('/genre/movie/list', { revalidate: 60 * 60 * 24 });
}

export function searchTmdbSeries(query: string, page = 1) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return discoverTopRatedTmdbSeries(page);
  }

  return tmdbRequest<TmdbTvSearchResponse>('/search/tv', {
    params: {
      include_adult: false,
      page,
      query: trimmedQuery,
    },
    revalidate: 60 * 15,
  });
}

export function discoverTopRatedTmdbSeries(page = 1) {
  return tmdbRequest<TmdbTvSearchResponse>('/discover/tv', {
    params: {
      include_adult: false,
      include_null_first_air_dates: false,
      page,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 500,
    },
    revalidate: 60 * 60,
  });
}

export function getTmdbSeriesGenres() {
  return tmdbRequest<TmdbGenreResponse>('/genre/tv/list', { revalidate: 60 * 60 * 24 });
}
