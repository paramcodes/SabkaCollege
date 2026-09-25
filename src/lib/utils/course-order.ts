export const normalizePositions = <T extends { position: number }>(items: T[]): T[] =>
  [...items]
    .sort((left, right) => left.position - right.position)
    .map((item, position) => ({ ...item, position }));
