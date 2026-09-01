export type RoomRating = {
  contentId: string;
  title: string;
  type: 'MOVIE' | 'SERIES';
  posterUrl: string | null;
  releaseYear: string | null;
  rating: number;
};

export function calculateRoomMatches(ratings: RoomRating[], minimumRatings: number) {
  const grouped = new Map<string, { content: RoomRating; values: number[] }>();
  for (const rating of ratings) {
    const current = grouped.get(rating.contentId) ?? { content: rating, values: [] };
    current.values.push(rating.rating);
    grouped.set(rating.contentId, current);
  }

  return [...grouped.values()]
    .filter((item) => item.values.length >= minimumRatings)
    .map(({ content, values }) => ({
      id: content.contentId,
      title: content.title,
      type: content.type,
      posterUrl: content.posterUrl,
      releaseYear: content.releaseYear,
      average: (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
      ratingCount: values.length,
    }))
    .sort((a, b) => Number(b.average) - Number(a.average));
}
