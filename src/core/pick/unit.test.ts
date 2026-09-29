import { describe, expect, it } from "vitest";
import { createUnitBoard, unitPieceDifficulty, UNIT_DECOY_COUNTS, type SourcePiece } from "./game";

function artwork(characterId: string, memberId: string, count: number, similarityTags = ["blue"]): SourcePiece[] {
  return Array.from({ length: count }, (_, pieceIndex) => ({
    characterId, memberId, similarityTags, pieceIndex, src: `${characterId}/${pieceIndex}.webp`,
  }));
}

function seeded(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function roster(targetCount = 9, hardCount = 12, mediumCount = 24, easyCount = 60): SourcePiece[] {
  return [
    ...artwork("front", "a", targetCount),
    ...artwork("back", "a", hardCount),
    ...artwork("other-blue", "b", mediumCount),
    ...artwork("other-yellow", "c", easyCount, ["yellow"]),
  ];
}

function counts(board: readonly SourcePiece[], target: SourcePiece) {
  return board.reduce((result, piece) => {
    result[unitPieceDifficulty(target, piece)] += 1;
    return result;
  }, { target: 0, hard: 0, medium: 0, easy: 0 });
}

describe("PUZZLE difficulty mix", () => {
  it.each([9, 12])("preserves all %i answers and fills 49 unique tiles with 2 hard + 12 medium + easy", targetCount => {
    const pieces = roster(targetCount);
    expect(UNIT_DECOY_COUNTS).toEqual({ hard: 2, medium: 12 });
    for (let seed = 1; seed <= 100; seed++) {
      const board = createUnitBoard("front", pieces, 49, seeded(seed));
      expect(counts(board, pieces[0]!)).toEqual({ target: targetCount, hard: 2, medium: 12, easy: 49 - targetCount - 14 });
      expect(new Set(board.map(tile => tile.src)).size).toBe(49);
      expect(new Set(board.map(tile => tile.id)).size).toBe(49);
      expect(board.filter(tile => tile.target).map(tile => tile.pieceIndex).sort((a, b) => a - b)).toEqual(Array.from({ length: targetCount }, (_, i) => i));
      expect(board.every(tile => tile.target === (tile.characterId === "front"))).toBe(true);
    }
  });

  it("prioritizes artwork identity, then member identity, then reviewed color/form tags", () => {
    const target = artwork("front", "a", 1)[0]!;
    expect(unitPieceDifficulty(target, target)).toBe("target");
    expect(unitPieceDifficulty(target, artwork("back", "a", 1)[0]!)).toBe("hard");
    expect(unitPieceDifficulty(target, artwork("recolored", "a", 1, ["yellow"])[0]!)).toBe("hard");
    expect(unitPieceDifficulty(target, artwork("similar", "b", 1, ["round", "blue"])[0]!)).toBe("medium");
    expect(unitPieceDifficulty(target, artwork("different", "c", 1, ["yellow"])[0]!)).toBe("easy");
  });

  it("caps all current and future poses together at two, even with different filenames and colors", () => {
    const pieces = [
      ...roster(),
      ...artwork("other-neutral", "d", 40, ["black-white"]),
      ...artwork("future-3d", "a", 9, ["yellow"]),
      ...artwork("unrelated-filename-01", "a", 12, ["pink"]),
    ];
    for (const targetId of ["front", "back", "future-3d", "unrelated-filename-01"]) {
      const target = pieces.find(piece => piece.characterId === targetId)!;
      for (let seed = 1; seed <= 30; seed++) {
        const board = createUnitBoard(targetId, pieces, 49, seeded(seed));
        expect(board.filter(piece => piece.memberId === "a" && !piece.target)).toHaveLength(2);
      }
      // The rule is relative to each artwork, not just the original front pose.
      expect(unitPieceDifficulty(target, pieces.find(piece => piece.memberId !== "a")!)).not.toBe("hard");
    }
  });

  it.each([0, 1])("fills missing hard candidates with easy pieces when only %i are available", hardCount => {
    const pieces = roster(9, hardCount);
    expect(counts(createUnitBoard("front", pieces), pieces[0]!)).toEqual({ target: 9, hard: hardCount, medium: 12, easy: 28 - hardCount });
  });

  it("treats any shared group-picture member as hard in either direction", () => {
    const group = { ...artwork("group", "a", 1)[0]!, otherMemberIds: ["b", "c"] };
    for (const member of ["a", "b", "c"]) {
      const single = artwork(`single-${member}`, member, 1, ["yellow"])[0]!;
      expect(unitPieceDifficulty(group, single)).toBe("hard");
      expect(unitPieceDifficulty(single, group)).toBe("hard");
    }
    const otherGroup = { ...artwork("group-two", "d", 1)[0]!, otherMemberIds: ["c"] };
    expect(unitPieceDifficulty(group, otherGroup)).toBe("hard");
    expect(unitPieceDifficulty(otherGroup, group)).toBe("hard");
    expect(unitPieceDifficulty(group, group)).toBe("target");
    expect(unitPieceDifficulty(group, artwork("different", "e", 1, ["yellow"])[0]!)).toBe("easy");
  });

  it("caps all depicted members of a comic together, not two decoys per member", () => {
    const pieces = [
      ...artwork("group", "a", 9).map(piece => ({ ...piece, otherMemberIds: ["b", "c"] })),
      ...artwork("single-a", "a", 12), ...artwork("single-b", "b", 12), ...artwork("single-c", "c", 12),
      ...artwork("medium", "d", 20), ...artwork("easy", "e", 40, ["yellow"]),
    ];
    for (let seed = 1; seed <= 50; seed++) {
      const board = createUnitBoard("group", pieces, 49, seeded(seed));
      expect(counts(board, pieces[0]!)).toEqual({ target: 9, hard: 2, medium: 12, easy: 26 });
      expect(board.filter(piece => !piece.target && ["a", "b", "c"].includes(piece.memberId))).toHaveLength(2);
    }
  });

  it("fills missing medium candidates with easy pieces, never spare hard ones", () => {
    const pieces = roster(12, 60, 4);
    expect(counts(createUnitBoard("front", pieces), pieces[0]!)).toEqual({ target: 12, hard: 2, medium: 4, easy: 31 });
  });

  it("reports insufficient safe content instead of repeating tiles or increasing difficulty", () => {
    const pieces = roster(9, 50, 50, 25);
    expect(() => createUnitBoard("front", pieces)).toThrow("Not enough easy puzzle pieces for front");
  });

  it("leaves the input unchanged and randomizes both the selected pieces and final positions", () => {
    const pieces = roster();
    const original = structuredClone(pieces);
    const first = createUnitBoard("front", pieces, 49, seeded(1));
    const second = createUnitBoard("front", pieces, 49, seeded(2));
    expect(pieces).toEqual(original);
    expect(first).toEqual(createUnitBoard("front", pieces, 49, seeded(1)));
    expect(first.map(tile => tile.src)).not.toEqual(second.map(tile => tile.src));
    expect(first.map(tile => tile.src).sort()).not.toEqual(second.map(tile => tile.src).sort());
    expect(first.slice(0, 9).every(tile => tile.target)).toBe(false);
  });

  it("never drops answers for smaller boards and rejects invalid targets or sizes", () => {
    const pieces = roster();
    expect(() => createUnitBoard("missing", pieces)).toThrow("No pieces for missing");
    for (const size of [8, 0, -1, 49.5, NaN, Infinity]) expect(() => createUnitBoard("front", pieces, size)).toThrow("Invalid puzzle board size");
    expect(counts(createUnitBoard("front", pieces, 9), pieces[0]!)).toEqual({ target: 9, hard: 0, medium: 0, easy: 0 });
    expect(createUnitBoard("front", pieces, 10)).toHaveLength(10);
  });
});
