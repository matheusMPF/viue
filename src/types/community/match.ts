export type MatchContentType = 'MOVIE' | 'SERIES';
export type MatchSessionStatus = 'WAITING' | 'ACTIVE' | 'MATCHED' | 'CANCELED';
export type MatchVoteDecision = 'LIKE' | 'PASS';

export type MatchFilters = {
  genreId?: number;
  runtimeMax?: number;
  runtimeMin?: number;
  yearFrom?: number;
  yearTo?: number;
};

export type MatchPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type MatchCandidateView = {
  candidateId: string;
  contentId: string;
  description: string | null;
  genres: string[];
  posterUrl: string | null;
  position: number;
  rating: string | null;
  releaseYear: string | null;
  title: string;
};

export type MatchSessionView = {
  id: string;
  type: MatchContentType;
  status: MatchSessionStatus;
  isParticipant: boolean;
  isOwner: boolean;
  owner: MatchPerson;
  participants: MatchPerson[];
  participantCount: number;
  round: null | {
    id: string;
    number: number;
    candidateCount: number;
    myVoteCount: number;
    currentCandidateVoteCount: number;
    currentUserDecision: MatchVoteDecision | null;
    hasVotedCurrentCandidate: boolean;
    isExhausted: boolean;
    filters: MatchFilters;
  };
  currentCandidate: MatchCandidateView | null;
  matchedContent:
    (Omit<MatchCandidateView, 'candidateId' | 'position'> & { isInMyLibrary: boolean }) | null;
  filterOptions: { id: number; name: string }[];
};
