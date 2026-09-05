import type { Meta, StoryObj } from '@storybook/nextjs';

import type { MatchSessionView } from '@/types/community/match';
import { RoomMatch } from './room-match';

const participants = [
  { id: '1', name: 'Matheus Lima', avatarUrl: null },
  { id: '2', name: 'Julia Alves', avatarUrl: null },
  { id: '3', name: 'Pedro Costa', avatarUrl: null },
];

const activeSession: MatchSessionView = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'MOVIE',
  status: 'ACTIVE',
  isParticipant: true,
  isOwner: true,
  owner: participants[0],
  participants,
  participantCount: participants.length,
  round: {
    id: '22222222-2222-4222-8222-222222222222',
    number: 1,
    candidateCount: 50,
    myVoteCount: 17,
    currentCandidateVoteCount: 0,
    currentUserDecision: null,
    hasVotedCurrentCandidate: false,
    isExhausted: false,
    filters: {},
  },
  currentCandidate: {
    candidateId: '33333333-3333-4333-8333-333333333333',
    contentId: '44444444-4444-4444-8444-444444444444',
    description:
      'As reservas naturais da Terra estão chegando ao fim. Um grupo de exploradores atravessa um buraco de minhoca para buscar um novo lar para a humanidade.',
    genres: ['Ficção científica', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    position: 18,
    rating: '8.7',
    releaseYear: '2014',
    title: 'Interestelar',
  },
  matchedContent: null,
  filterOptions: [],
};

const meta = {
  title: 'Produto/Match da sala',
  component: RoomMatch,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ margin: '0 auto', maxWidth: 1180 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    initialSession: activeSession,
    roomId: '55555555-5555-4555-8555-555555555555',
  },
} satisfies Meta<typeof RoomMatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VotacaoAtiva: Story = {};

export const AguardandoOutrosVotos: Story = {
  args: {
    initialSession: {
      ...activeSession,
      round: {
        ...activeSession.round!,
        currentCandidateVoteCount: 1,
        currentUserDecision: 'LIKE',
        hasVotedCurrentCandidate: true,
        myVoteCount: 18,
      },
    },
  },
};

export const FimDaRodada: Story = {
  args: {
    initialSession: {
      ...activeSession,
      currentCandidate: null,
      filterOptions: [
        { id: 28, name: 'Ação' },
        { id: 35, name: 'Comédia' },
        { id: 18, name: 'Drama' },
        { id: 878, name: 'Ficção científica' },
      ],
      round: {
        ...activeSession.round!,
        isExhausted: true,
        myVoteCount: 50,
      },
    },
  },
};

export const MatchEncontrado: Story = {
  args: {
    initialSession: {
      ...activeSession,
      status: 'MATCHED',
      currentCandidate: null,
      matchedContent: {
        contentId: activeSession.currentCandidate!.contentId,
        description: activeSession.currentCandidate!.description,
        genres: activeSession.currentCandidate!.genres,
        posterUrl: activeSession.currentCandidate!.posterUrl,
        rating: activeSession.currentCandidate!.rating,
        releaseYear: activeSession.currentCandidate!.releaseYear,
        title: activeSession.currentCandidate!.title,
        isInMyLibrary: false,
      },
    },
  },
};
