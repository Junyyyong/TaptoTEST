import type { SourcePiece, UnitArtworkProfile } from "../core/pick/game";

export interface PuzzleCharacter extends UnitArtworkProfile {
  id: string;
  celebrationId: string;
  name: string;
  displayName: string;
  folder: string;
  preview: string;
  pieces: readonly string[];
  columns: 3;
  rows: 3 | 4;
  showGrid?: boolean;
}

export interface MontageCharacter {
  id: string;
  name: string;
  displayName: string;
  answer: string;
  variations: readonly string[];
  easyVariations: readonly number[];
  mediumVariations: readonly number[];
  hardVariations: readonly number[];
}

const KOREAN_NAMES: Record<string, string> = {
  Tapee: "태피", Tepee: "티피", Hooopee: "후피", Zapee: "재피",
  Hapee: "해피", Bbogles: "뽀글스", PinoPan: "피노팬",
};

// These are broad visual groups reviewed against the current artwork, not
// automatic image analysis. Every new pose of a named member inherits its
// stable identity, so it shares the two-tile hard-decoy cap with older poses.
const UNIT_MEMBER_PROFILES: Record<string, UnitArtworkProfile> = {
  Bbogles: { memberId: "bb", similarityTags: ["yellow-rounded", "instrument"] },
  Hapee: { memberId: "ha", similarityTags: ["yellow-rounded", "white-face"] },
  Hooopee: { memberId: "hoo", similarityTags: ["white-face", "instrument"] },
  Zapee: { memberId: "ja", similarityTags: ["blue-yellow-details"] },
  PinoPan: { memberId: "pino", similarityTags: ["white-face", "blue-yellow-details"] },
  Tapee: { memberId: "tapee", similarityTags: ["blue-yellow-details"] },
  Tepee: { memberId: "tepee", similarityTags: ["yellow-rounded"] },
};

function bilingualName(name: string): string {
  const korean = KOREAN_NAMES[name];
  if (!korean) throw new Error(`Missing Korean character name: ${name}`);
  return `${korean} ${name}`;
}

const pieceModules = import.meta.glob<string>(
  [
    "/optimized/Bb/*.webp",
    "/optimized/Ha/*.webp",
    "/optimized/HapeeCarrot/*.webp",
    "/optimized/HapeeCarrot02/*.webp",
    "/optimized/TapeeBack/*.webp",
    "/optimized/TepeeBack/*.webp",
    "/optimized/HooopeeBack/*.webp",
    "/optimized/ComicA114/*.webp",
    "/optimized/ComicA224/*.webp",
    "/optimized/ComicA424/*.webp",
    "/optimized/ComicA1634/*.webp",
    "/optimized/Hoo/*.webp",
    "/optimized/Ja/*.webp",
    "/optimized/Pino/*.webp",
    "/optimized/Tapee/*.webp",
    "/optimized/Tepee/*.webp",
  ],
  { eager: true, query: "?url", import: "default" },
);

const unitPreviewModules = import.meta.glob<string>("/optimized/unit/*.webp", { eager: true, query: "?url", import: "default" });
const montageModules = import.meta.glob<string>(
  [
    "/optimized/montage/haepi/answer.webp",
    "/optimized/montage/bbogles/answer.webp",
    "/optimized/montage/tapee/answer.webp",
    "/optimized/montage/tepee/answer.webp",
    "/optimized/montage/hupi/answer.webp",
    "/optimized/montage/jaepi/answer.webp",
    "/optimized/montage/pino/answer.webp",
  ],
  { eager: true, query: "?url", import: "default" },
);

const natural = new Intl.Collator("en", { numeric: true });

function character(id: string, name: string, folder: string, showGrid = false, celebrationId = id, otherMembers: readonly string[] = []): PuzzleCharacter {
  const profile = UNIT_MEMBER_PROFILES[name];
  if (!profile) throw new Error(`Missing puzzle difficulty profile: ${name}`);
  const otherMemberIds = otherMembers.map(member => {
    const other = UNIT_MEMBER_PROFILES[member];
    if (!other) throw new Error(`Missing puzzle difficulty profile: ${member}`);
    return other.memberId;
  });
  const files = Object.entries(pieceModules)
    .filter(([path]) => path.startsWith(`/optimized/${folder}/`))
    .sort(([a], [b]) => natural.compare(a, b));
  const pieces = files.map(([, url]) => url);

  if (pieces.length !== 9 && pieces.length !== 12) {
    throw new Error(`${folder} must contain either 9 or 12 numbered WebP pieces`);
  }
  const preview = unitPreviewModules[`/optimized/unit/${folder}.webp`];
  if (!preview) throw new Error(`Missing unit preview: ${folder}.webp`);

  return {
    ...profile,
    otherMemberIds,
    id,
    celebrationId,
    name,
    displayName: bilingualName(name),
    folder,
    preview,
    pieces,
    columns: 3,
    rows: pieces.length === 9 ? 3 : 4,
    showGrid,
  };
}

export const PUZZLE_CHARACTERS: readonly PuzzleCharacter[] = [
  character("bb", "Bbogles", "Bb"),
  character("ha", "Hapee", "Ha"),
  character("hoo", "Hooopee", "Hoo"),
  character("ja", "Zapee", "Ja"),
  character("pino", "PinoPan", "Pino"),
  character("tapee", "Tapee", "Tapee"),
  character("tepee", "Tepee", "Tepee"),
];

// Each artwork has its own puzzle ID, even when it depicts the same character.
// Keep character identity separate so new poses still select the correct movie.
const ADDITIONAL_UNIT_PUZZLES: readonly PuzzleCharacter[] = [
  character("hapee-carrot", "Hapee", "HapeeCarrot", true, "ha"),
  character("hapee-carrot-02", "Hapee", "HapeeCarrot02", true, "ha"),
  character("tapee-back", "Tapee", "TapeeBack", true, "tapee"),
  character("tepee-back", "Tepee", "TepeeBack", true, "tepee"),
  character("hooopee-back", "Hooopee", "HooopeeBack", true, "hoo"),
];

function comic(id: string, name: string, folder: string, otherMembers: readonly string[] = []): PuzzleCharacter {
  const primary = UNIT_MEMBER_PROFILES[name];
  if (!primary) throw new Error(`Missing puzzle difficulty profile: ${name}`);
  const artwork = character(id, name, folder, true, primary.memberId, otherMembers);
  // Use the main subject's visual profile and a shared felt/comic texture tag.
  // Depicted-member overlap is checked first, including secondary characters.
  return { ...artwork, similarityTags: [...artwork.similarityTags, "felt-comic"] };
}

export const COMIC_UNIT_PUZZLES: readonly PuzzleCharacter[] = [
  comic("comic-a-1-1-4", "Tapee", "ComicA114", ["Tepee"]),
  comic("comic-a-2-2-4", "Tepee", "ComicA224"),
  comic("comic-a-4-2-4", "Tapee", "ComicA424", ["Tepee", "Hooopee"]),
  comic("comic-a-16-3-4", "Hooopee", "ComicA1634"),
];
export const UNIT_TARGET_CHARACTERS: readonly PuzzleCharacter[] = [
  ...PUZZLE_CHARACTERS,
  ...ADDITIONAL_UNIT_PUZZLES,
  ...COMIC_UNIT_PUZZLES,
];
const UNIT_PIECE_SOURCES = UNIT_TARGET_CHARACTERS;

export const ALL_PIECES: readonly SourcePiece[] = UNIT_PIECE_SOURCES.flatMap((entry) =>
  // Natural filename order maps 1..9/12 to left-to-right, top-to-bottom cells.
  entry.pieces.map((src, pieceIndex) => ({
    characterId: entry.id, memberId: entry.memberId, otherMemberIds: entry.otherMemberIds,
    similarityTags: entry.similarityTags, pieceIndex, src,
  })),
);

export const PICTURE_PIECES_SCORE_BANDS = [
  { maxMs: 10_000, score: 1500 },
  { maxMs: 20_000, score: 1200 },
  { maxMs: 30_000, score: 900 },
  { maxMs: 45_000, score: 600 },
  { maxMs: Infinity, score: 300 },
] as const;

export const MEMORY_REVEAL_DELAY_MS = {
  match: 250,
  mismatch: 450,
} as const;

const PORTRAIT_MEMBERS = [
  ["haepi", "Hapee"], ["bbogles", "Bbogles"], ["tapee", "Tapee"],
  ["tepee", "Tepee"], ["hupi", "Hooopee"], ["jaepi", "Zapee"], ["pino", "PinoPan"],
] as const;

const portraitModules = import.meta.glob<string>("/optimized/portrait/*/*.webp", { eager: true, query: "?url", import: "default" });

// The upload's numbering defines difficulty; older exclusions do not apply here.
export const MONTAGE_CHARACTERS = PORTRAIT_MEMBERS.map(([id, name]) => {
  const base = `/optimized/portrait/${id}`;
  const answer = portraitModules[`${base}/answer.webp`];
  const variations = Array.from({ length: 24 }, (_, index) => portraitModules[`${base}/variation-${index + 1}.webp`]!);
  if (!answer || variations.some(url => !url)) throw new Error(`Missing portrait images: ${id}`);
  return { id, name, displayName: bilingualName(name), answer, variations,
    easyVariations: [0, 1, 2, 3, 4],
    mediumVariations: Array.from({ length: 15 }, (_, index) => index + 5),
    hardVariations: [20, 21, 22, 23],
  } satisfies MontageCharacter;
});

// Preserve POSITION's original faces independently of PORTRAIT's new artwork.
export const MEMORY_FACES = PORTRAIT_MEMBERS.map(([id]) => {
  const answer = montageModules[`/optimized/montage/${id}/answer.webp`];
  if (!answer) throw new Error(`Missing memory face: ${id}`);
  return answer;
});

export const MEMORY_FACE_CHARACTERS = Object.fromEntries(MEMORY_FACES.map((src, index) => [src, PORTRAIT_MEMBERS[index]![0]]));

export const GAME_IMAGE_URLS = [
  ...MEMORY_FACES,
  ...UNIT_PIECE_SOURCES.map((character) => character.preview),
  ...MONTAGE_CHARACTERS.map((character) => character.answer),
  ...ALL_PIECES.map((piece) => piece.src),
  ...MONTAGE_CHARACTERS.flatMap((character) => character.variations),
] as const;

// Memory uses only the seven original faces, never montage variations.
export const MEMORY_PREVIEW_MS = 3_000;
