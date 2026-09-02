export type TmdbMovieSummary = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
};

export type TmdbMovieSearchResponse = {
  page: number;
  results: TmdbMovieSummary[];
  total_pages: number;
  total_results: number;
};

export type TmdbTvSummary = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
};

export type TmdbTvSearchResponse = {
  page: number;
  results: TmdbTvSummary[];
  total_pages: number;
  total_results: number;
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbGenreResponse = {
  genres: TmdbGenre[];
};

export type TmdbSeasonSummary = {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
};

export type TmdbTvDetail = TmdbTvSummary & {
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TmdbSeasonSummary[];
};

export type TmdbEpisodeSummary = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
};

export type TmdbSeasonDetail = {
  id: number;
  season_number: number;
  name: string;
  episodes: TmdbEpisodeSummary[];
};

export type CatalogMovie = {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  releaseYear: string | null;
  rating: string | null;
  voteCount: number | null;
  genres: string[];
};

export type CatalogSeries = CatalogMovie;
