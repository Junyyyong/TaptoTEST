export type Random = () => number;

export interface UnitArtworkProfile {
  /** Stable member identity, shared by front/back poses and future artworks. */
  memberId: string;
  /** Other depicted members in a group picture; all share the hard-decoy cap. */
  otherMemberIds?: readonly string[];
  /** Content-reviewed color/form similarities, not inferred from filenames. */
  similarityTags: readonly string[];
}

export interface SourcePiece extends UnitArtworkProfile {
  /** The unique artwork ID (retained as characterId for existing callers). */
  characterId: string;
  pieceIndex: number;
  src: string;
}

export interface UnitTile extends SourcePiece {
  id: number;
  target: boolean;
}

export interface MontageTile {
  id: number;
  exact: boolean;
  variationIndex: number;
}

export const PICK_MISTAKE_LIMIT = 5;

export function pickChances(mistakes: number): { remaining: number; gameOver: boolean } {
  const remaining = Math.max(0, PICK_MISTAKE_LIMIT - mistakes);
  return { remaining, gameOver: remaining === 0 };
}

export interface MemoryCard {
  id: number;
  pairId: number;
  src: string;
  free: boolean;
}

export function shuffle<T>(values: readonly T[], random: Random = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function createRandomIndexCycle(itemCount: number, previousIndex = -1, random: Random = Math.random): number[] {
  if (!Number.isInteger(itemCount) || itemCount < 1) throw new Error("A positive integer item count is required");
  const indices = Array.from({ length: itemCount }, (_, index) => index);
  if (itemCount === 1 || previousIndex < 0 || previousIndex >= itemCount) return shuffle(indices, random);

  const firstChoices = indices.filter((index) => index !== previousIndex);
  const first = firstChoices[Math.floor(random() * firstChoices.length)]!;
  return [first, ...shuffle(indices.filter((index) => index !== first), random)];
}

/** Consume every character once, including across game restarts in this session. */
export class RandomIndexCycle {
  private remaining: number[] = [];
  private previous = -1;

  constructor(private readonly itemCount: number, private readonly random: Random = Math.random) {
    if (!Number.isInteger(itemCount) || itemCount < 1) throw new Error("A positive integer item count is required");
  }

  next(): number {
    if (!this.remaining.length) this.remaining = createRandomIndexCycle(this.itemCount, this.previous, this.random);
    this.previous = this.remaining.shift()!;
    return this.previous;
  }
}

export const UNIT_DECOY_COUNTS = { hard: 2, medium: 12 } as const;
export type UnitPieceDifficulty = "target" | "hard" | "medium" | "easy";

export function unitPieceDifficulty(target: SourcePiece, piece: SourcePiece): UnitPieceDifficulty {
  if (piece.characterId === target.characterId) return "target";
  // Same-member artworks must never leak into medium/easy, even if recolored.
  const targetMembers = [target.memberId, ...target.otherMemberIds ?? []];
  const pieceMembers = [piece.memberId, ...piece.otherMemberIds ?? []];
  if (pieceMembers.some(memberId => targetMembers.includes(memberId))) return "hard";
  return piece.similarityTags.some(tag => target.similarityTags.includes(tag)) ? "medium" : "easy";
}

export function createUnitBoard(targetId: string, pieces: readonly SourcePiece[], size = 49, random: Random = Math.random): UnitTile[] {
  const targets = pieces.filter((piece) => piece.characterId === targetId);
  if (!targets.length) throw new Error(`No pieces for ${targetId}`);
  if (!Number.isInteger(size) || targets.length > size) throw new Error("Invalid puzzle board size");

  const pools: Record<Exclude<UnitPieceDifficulty, "target">, SourcePiece[]> = { hard: [], medium: [], easy: [] };
  for (const piece of pieces) {
    const difficulty = unitPieceDifficulty(targets[0]!, piece);
    if (difficulty !== "target") pools[difficulty].push(piece);
  }
  const remaining = size - targets.length;
  const hardCount = Math.min(UNIT_DECOY_COUNTS.hard, pools.hard.length, remaining);
  const mediumCount = Math.min(UNIT_DECOY_COUNTS.medium, pools.medium.length, remaining - hardCount);
  const easyCount = remaining - hardCount - mediumCount;
  // Missing hard/medium pieces are replaced only by easier ones. Do not raise
  // difficulty or repeat tiles to mask an incomplete future content roster.
  if (pools.easy.length < easyCount) throw new Error(`Not enough easy puzzle pieces for ${targetId}`);
  const decoys = [
    ...shuffle(pools.hard, random).slice(0, hardCount),
    ...shuffle(pools.medium, random).slice(0, mediumCount),
    ...shuffle(pools.easy, random).slice(0, easyCount),
  ];

  return shuffle(
    [...targets, ...decoys].map((piece, id) => ({ ...piece, id, target: piece.characterId === targetId })),
    random,
  );
}

export function createMontageBoard(variationCount: number, size = 25, random: Random = Math.random): MontageTile[] {
  if (variationCount < 1) throw new Error("Montage mode needs at least one variation");
  const exactIndex = Math.floor(random() * size);
  const variationIndices = shuffle(Array.from({ length: size - 1 }, (_, index) => index % variationCount), random);
  let variationCursor = 0;
  return Array.from({ length: size }, (_, id) => id === exactIndex
    ? { id, exact: true, variationIndex: -1 }
    : { id, exact: false, variationIndex: variationIndices[variationCursor++]! });
}

export function createMemoryBoard(faces: readonly string[], size: 2 | 4 | 5 | 6 | 7 = 4, random: Random = Math.random): MemoryCard[] {
  if (faces.length !== 7 || new Set(faces).size !== 7) throw new Error("Memory mode needs seven distinct faces");
  const pairCount = Math.floor(size * size / 2);
  const faceOrder = shuffle(faces, random);
  const board = shuffle(Array.from({ length: pairCount }, (_, pairId) => faceOrder[pairId % faceOrder.length]!).flatMap((src, pairId) => [
    { id: pairId * 2, pairId, src, free: false },
    { id: pairId * 2 + 1, pairId, src, free: false },
  ]), random);
  if (size % 2) board.splice(pairCount, 0, { id: size * size - 1, pairId: -1, src: "", free: true });
  return board;
}

export function timeScore(elapsedMs: number, mistakes = 0, base = 5000): number {
  return Math.max(100, Math.round(base - elapsedMs / 25 - mistakes * 100));
}

export interface TimeScoreBand {
  maxMs: number;
  score: number;
}

export function tieredTimeScore(elapsedMs: number, bands: readonly TimeScoreBand[]): number {
  return bands.find((band) => elapsedMs <= band.maxMs)?.score ?? 0;
}
