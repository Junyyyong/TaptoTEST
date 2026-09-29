import { describe, expect, it } from "vitest";
import { GAME_IMAGE_URLS, MEMORY_FACES, MEMORY_PREVIEW_MS, MEMORY_REVEAL_DELAY_MS, MONTAGE_CHARACTERS, PICTURE_PIECES_SCORE_BANDS } from "./puzzles";
import { tieredTimeScore } from "../core/pick/game";
import { ALL_PIECES, COMIC_UNIT_PUZZLES, PUZZLE_CHARACTERS, UNIT_TARGET_CHARACTERS } from "./puzzles";
import { createUnitBoard, RandomIndexCycle, unitPieceDifficulty } from "../core/pick/game";
import { createProgressiveMontageBoard } from "../core/pick/montage";
import { PICK_MODES } from "./pickModes";
import { APP_CONFIG } from "../config/app";
import { MEMORY_FACE_CHARACTERS } from "./puzzles";

describe("Puzzle content", () => {
  it("cycles through every registered artwork once independently of PORTRAIT", () => {
    let state = 42;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const puzzleOrder = new RandomIndexCycle(UNIT_TARGET_CHARACTERS.length, random);
    const portraitOrder = new RandomIndexCycle(MONTAGE_CHARACTERS.length, random);
    const expectedIds = UNIT_TARGET_CHARACTERS.map(artwork => artwork.id).sort();
    let previousIds: string[] = [];
    for (let cycle = 0; cycle < 5; cycle++) {
      const ids = UNIT_TARGET_CHARACTERS.map(() => {
        portraitOrder.next();
        return UNIT_TARGET_CHARACTERS[puzzleOrder.next()]!.id;
      });
      expect([...ids].sort()).toEqual(expectedIds);
      if (previousIds.length) {
        expect(ids[0]).not.toBe(previousIds.at(-1));
        expect(ids).not.toEqual(previousIds);
      }
      previousIds = ids;
    }
  });
  it("uses the three approved single-word mode names", () => {
    expect(Object.values(PICK_MODES).map(mode => mode.title)).toEqual(["PUZZLE", "PORTRAIT", "POSITION"]);
  });
  it("keeps the original carrot alongside four new nine-piece artworks", () => {
    expect(UNIT_TARGET_CHARACTERS).toHaveLength(16);
    const target=UNIT_TARGET_CHARACTERS.find(c => c.folder === "HapeeCarrot")!;
    expect(target.id).toBe("hapee-carrot");
    expect(target.showGrid).toBe(true);
    expect([target.columns,target.rows]).toEqual([3,3]);
    expect(target.preview).toContain("HapeeCarrot.webp");
    expect(target.pieces).toHaveLength(9);
    expect(target.pieces.every((src,i)=>src.includes(`/HapeeCarrot/${i+1}.webp`))).toBe(true);
    const board=createUnitBoard(target.id,ALL_PIECES);
    expect(board.filter(tile=>tile.target)).toHaveLength(9);
    expect(board.filter(tile=>!tile.target)).toHaveLength(40);
    expect(ALL_PIECES.some(piece=>piece.src.includes("/Ha/"))).toBe(true);
    for(const src of [target.preview,...target.pieces])expect(GAME_IMAGE_URLS).toContain(src);
  });
  it("preserves all seven original puzzles alongside the five additions", () => {
    expect(PUZZLE_CHARACTERS.map(c => c.folder)).toEqual(["Bb", "Ha", "Hoo", "Ja", "Pino", "Tapee", "Tepee"]);
    for (const original of PUZZLE_CHARACTERS) expect(UNIT_TARGET_CHARACTERS).toContain(original);
    expect(UNIT_TARGET_CHARACTERS.find(c => c.id === "ha")!.preview).toContain("/Ha.webp");
    expect(UNIT_TARGET_CHARACTERS.find(c => c.id === "tapee")!.pieces).toHaveLength(12);
  });
  it("gives every original and added artwork its own targets and the correct movie", () => {
    expect(UNIT_TARGET_CHARACTERS.map(c => [c.folder, c.celebrationId])).toEqual([
      ["Bb", "bb"], ["Ha", "ha"], ["Hoo", "hoo"], ["Ja", "ja"],
      ["Pino", "pino"], ["Tapee", "tapee"], ["Tepee", "tepee"],
      ["HapeeCarrot", "ha"], ["HapeeCarrot02", "ha"], ["TapeeBack", "tapee"],
      ["TepeeBack", "tepee"], ["HooopeeBack", "hoo"],
      ["ComicA114", "tapee"], ["ComicA224", "tepee"],
      ["ComicA424", "tapee"], ["ComicA1634", "hoo"],
    ]);
    expect(new Set(UNIT_TARGET_CHARACTERS.map(c => c.id)).size).toBe(16);
    for (const target of UNIT_TARGET_CHARACTERS) {
      if (!PUZZLE_CHARACTERS.includes(target)) expect(target.showGrid).toBe(true);
      expect(target.columns).toBe(3);
      expect(target.pieces).toHaveLength(target.columns * target.rows);
      expect(target.celebrationId in APP_CONFIG.assets.characterCelebrations).toBe(true);
      for (const src of [target.preview, ...target.pieces]) expect(GAME_IMAGE_URLS).toContain(src);
      for (const seed of [0.1, 0.42, 0.9]) {
        const board = createUnitBoard(target.id, ALL_PIECES, 49, () => seed);
        expect(board).toHaveLength(49);
        expect(board.filter(tile => tile.target).map(tile => tile.src).sort()).toEqual([...target.pieces].sort());
        expect(board.filter(tile => !tile.target)).toHaveLength(49 - target.pieces.length);
        expect(board.filter(tile => !tile.target).every(tile => !target.pieces.includes(tile.src))).toBe(true);
      }
    }
  });
  it("shares the approved Korean and English names between games 1 and 2", () => {
    const expected = ["태피 Tapee", "티피 Tepee", "후피 Hooopee", "재피 Zapee", "해피 Hapee", "뽀글스 Bbogles", "피노팬 PinoPan"].sort();
    expect(PUZZLE_CHARACTERS.map(c => c.displayName).sort()).toEqual(expected);
    expect(MONTAGE_CHARACTERS.map(c => c.displayName).sort()).toEqual(expected);
  });
  it("inherits stable member identity and difficulty metadata for every registered artwork", () => {
    for (const artwork of UNIT_TARGET_CHARACTERS) {
      const member = PUZZLE_CHARACTERS.find(original => original.name === artwork.name)!;
      expect(artwork.memberId).toBe(member.id);
      expect(artwork.similarityTags.length).toBeGreaterThan(0);
      expect(artwork.similarityTags).toEqual(expect.arrayContaining([...member.similarityTags]));
      for (const piece of ALL_PIECES.filter(piece => piece.characterId === artwork.id)) {
        expect(piece.memberId).toBe(artwork.memberId);
        expect(piece.otherMemberIds).toEqual(artwork.otherMemberIds);
        expect(piece.similarityTags).toEqual(artwork.similarityTags);
      }
    }
  });
  it("has enough medium/easy pieces for all original and added 9/12-piece targets without duplicates", () => {
    for (const artwork of UNIT_TARGET_CHARACTERS) {
      const target = ALL_PIECES.find(piece => piece.characterId === artwork.id)!;
      const members = [target.memberId, ...target.otherMemberIds ?? []];
      const sharesMember = (piece: typeof target) => [piece.memberId, ...piece.otherMemberIds ?? []].some(id => members.includes(id));
      const expectedHard = Math.min(2, ALL_PIECES.filter(piece => sharesMember(piece) && piece.characterId !== target.characterId).length);
      let state = 1;
      const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      for (let run = 0; run < 50; run++) {
        const board = createUnitBoard(artwork.id, ALL_PIECES, 49, random);
        expect(board).toHaveLength(49);
        expect(new Set(board.map(piece => piece.src)).size).toBe(49);
        expect(board.filter(tile => tile.target)).toHaveLength(artwork.pieces.length);
        expect(board.filter(tile => !tile.target && sharesMember(tile))).toHaveLength(expectedHard);
        expect(board.filter(tile => unitPieceDifficulty(target, tile) === "medium")).toHaveLength(12);
        expect(board.filter(tile => unitPieceDifficulty(target, tile) === "easy")).toHaveLength(49 - artwork.pieces.length - expectedHard - 12);
      }
    }
  });
  it("adds four comic panels with nine row-major pieces without changing PORTRAIT or POSITION", () => {
    expect(COMIC_UNIT_PUZZLES.map(artwork => [artwork.id, artwork.memberId, artwork.otherMemberIds])).toEqual([
      ["comic-a-1-1-4", "tapee", ["tepee"]],
      ["comic-a-2-2-4", "tepee", []],
      ["comic-a-4-2-4", "tapee", ["tepee", "hoo"]],
      ["comic-a-16-3-4", "hoo", []],
    ]);
    for (const artwork of COMIC_UNIT_PUZZLES) {
      expect(UNIT_TARGET_CHARACTERS).toContain(artwork);
      expect([artwork.columns, artwork.rows, artwork.showGrid]).toEqual([3, 3, true]);
      expect(artwork.similarityTags).toContain("felt-comic");
      expect(artwork.pieces).toHaveLength(9);
      expect(artwork.pieces.every((src, index) => src.includes(`/${artwork.folder}/${index + 1}.webp`))).toBe(true);
      expect(artwork.preview).toContain(`/${artwork.folder}.webp`);
      for (const src of [artwork.preview, ...artwork.pieces]) {
        expect(GAME_IMAGE_URLS).toContain(src);
        expect(MEMORY_FACES).not.toContain(src);
        expect(MONTAGE_CHARACTERS.flatMap(member => [member.answer, ...member.variations])).not.toContain(src);
      }
    }
  });
  it("keeps five score bands without a completion deadline", () => {
    expect(PICTURE_PIECES_SCORE_BANDS).toEqual([
      { maxMs: 10_000, score: 1500 },
      { maxMs: 20_000, score: 1200 },
      { maxMs: 30_000, score: 900 },
      { maxMs: 45_000, score: 600 },
      { maxMs: Infinity, score: 300 },
    ]);
    expect(tieredTimeScore(600_000, PICTURE_PIECES_SCORE_BANDS)).toBe(300);
  });

  it("keeps memory reveals readable without a long input lock", () => {
    expect(MEMORY_REVEAL_DELAY_MS).toEqual({ match: 250, mismatch: 450 });
  });

  it("uses only the seven preloaded original faces for memory, with no variations", () => {
    expect(MEMORY_FACES.map(src => MEMORY_FACE_CHARACTERS[src])).toEqual(["haepi", "bbogles", "tapee", "tepee", "hupi", "jaepi", "pino"]);
    expect(MEMORY_FACES).toHaveLength(7);
    expect(new Set(MEMORY_FACES).size).toBe(7);
    expect(MEMORY_FACES.every(face => face.includes("/optimized/montage/"))).toBe(true);
    expect(MEMORY_FACES.every((face) => !face.includes("variation"))).toBe(true);
    expect(MEMORY_PREVIEW_MS).toBe(3_000);
    MONTAGE_CHARACTERS.forEach((character) => expect(MEMORY_FACES).not.toContain(character.answer));
    MEMORY_FACES.forEach((face) => expect(GAME_IMAGE_URLS).toContain(face));
  });

  it("provides answer and distinct wrong variations for each montage character", () => {
    expect(MONTAGE_CHARACTERS.map((character) => [character.id, character.name, character.variations.length])).toEqual([
      ["haepi", "Hapee", 24],
      ["bbogles", "Bbogles", 24],
      ["tapee", "Tapee", 24],
      ["tepee", "Tepee", 24],
      ["hupi", "Hooopee", 24],
      ["jaepi", "Zapee", 24],
      ["pino", "PinoPan", 24],
    ]);
    MONTAGE_CHARACTERS.forEach((character) => {
      expect(character.easyVariations.length).toBeGreaterThanOrEqual(3);
      expect(character.hardVariations.length).toBe(4);
      expect(character.easyVariations.every((index) => !character.hardVariations.includes(index))).toBe(true);
      expect([...character.easyVariations, ...character.hardVariations].every((index) => index >= 0 && index < character.variations.length)).toBe(true);
      expect(character.answer).toMatch(/answer.*\.webp/);
      expect(new Set(character.variations)).toHaveLength(character.variations.length);
      expect(character.variations).not.toContain(character.answer);
      expect([character.answer, ...character.variations].every((url) => url.includes(`/optimized/portrait/${character.id}/`))).toBe(true);
    });
  });

  it("exposes every active game image once for splash-screen preloading", () => {
    expect(GAME_IMAGE_URLS).toHaveLength(354);
    expect(new Set(GAME_IMAGE_URLS)).toHaveLength(GAME_IMAGE_URLS.length);
    expect(GAME_IMAGE_URLS.every((url) => url.includes(".webp"))).toBe(true);
  });

  it("uses numbered difficulty tiers without duplicates for every character and stage", () => {
    for (const character of MONTAGE_CHARACTERS) {
      expect(character.variations.map(url => Number(url.match(/variation-(\d+)\.webp/)?.[1]))).toEqual(Array.from({length:24},(_,i)=>i+1));
      for (const [side, easy, medium, hard] of [[2,3,0,0],[3,5,3,0],[4,3,12,0],[5,5,15,4]]) {
        for (const seed of [0, .1, .42, .8, .9999]) {
          const board = createProgressiveMontageBoard(side!, character, () => seed);
          const wrong = board.filter(tile => !tile.exact).map(tile => tile.variationIndex);
          expect(board).toHaveLength(side! * side!);
          expect(board.filter(tile => tile.exact)).toHaveLength(1);
          expect(new Set(wrong).size).toBe(wrong.length);
          expect(wrong.filter(i => character.easyVariations.includes(i))).toHaveLength(easy!);
          expect(wrong.filter(i => character.mediumVariations.includes(i))).toHaveLength(medium!);
          expect(wrong.filter(i => character.hardVariations.includes(i))).toHaveLength(hard!);
        }
      }
    }
  });
});
