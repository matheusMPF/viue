import type { MatchVoteDecision } from '@/types/community/match';

export type MatchCandidateProgress = {
  id: string;
  voteCount: number;
};

export function findCurrentMatchCandidate<T extends MatchCandidateProgress>(
  candidates: readonly T[],
  participantCount: number,
) {
  return candidates.find((candidate) => candidate.voteCount < participantCount) ?? null;
}

export function hasUnanimousMatch(
  decisions: readonly MatchVoteDecision[],
  participantCount: number,
) {
  return (
    participantCount >= 2 &&
    decisions.length === participantCount &&
    decisions.every((decision) => decision === 'LIKE')
  );
}

export function isRoundComplete(
  voteCount: number,
  candidateCount: number,
  participantCount: number,
) {
  return (
    candidateCount > 0 && participantCount >= 2 && voteCount === candidateCount * participantCount
  );
}
