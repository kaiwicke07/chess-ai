import { describe, expect, it } from "vitest"

import { gameToPgn, lichessAnalysisUrl, pgnResult } from "@/lib/chess/share"
import { soundForPositions, soundForSan } from "@/lib/sound"
import { practiceStreak } from "@/lib/srs/streak"
import type { Game } from "@/lib/types"

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime()

describe("practiceStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(practiceStreak([at(1), at(2), at(3, 8), at(3, 20)], at(3, 21))).toEqual({ days: 3, today: true })
  })

  it("keeps yesterday's streak alive until today is over", () => {
    expect(practiceStreak([at(1), at(2)], at(3))).toEqual({ days: 2, today: false })
  })

  it("resets after a missed day", () => {
    expect(practiceStreak([at(1)], at(3))).toEqual({ days: 0, today: false })
    expect(practiceStreak([at(1), at(3)], at(3))).toEqual({ days: 1, today: true })
  })

  it("is zero with no practice", () => {
    expect(practiceStreak([], at(3))).toEqual({ days: 0, today: false })
  })

  it("steps by calendar day across a DST change", () => {
    // US clocks fall back on Nov 1 2026; the day is 25 hours long there
    const oct31 = new Date(2026, 9, 31, 23).getTime()
    expect(practiceStreak([oct31, at(1, 0), at(2, 1)], at(2, 9)).days).toBe(3)
  })
})

describe("sounds", () => {
  it("picks a sound from SAN", () => {
    expect(soundForSan("e4")).toBe("move")
    expect(soundForSan("Nxe5")).toBe("capture")
    expect(soundForSan("Bxf7+")).toBe("check")
    expect(soundForSan("Qh7#")).toBe("end")
    expect(soundForSan("O-O")).toBe("move")
  })

  it("spots captures between positions", () => {
    const before = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    const after = "rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2"
    expect(soundForPositions(before, after, false, false)).toBe("capture")
    expect(soundForPositions(after, after, true, false)).toBe("check")
    expect(soundForPositions(before, after, true, true)).toBe("end")
  })
})

const game = {
  id: "lichess:abc",
  platform: "lichess",
  sourceId: "abc",
  account: "lichess:me",
  url: "https://lichess.org/abc",
  playedAt: new Date(2026, 10, 2).getTime(),
  rated: true,
  speed: "blitz",
  timeControl: { initial: 180, increment: 2 },
  white: { name: "me", rating: 1500 },
  black: { name: "them", rating: null },
  userColor: "black",
  result: "loss",
  termination: "checkmate",
  opening: { eco: "C20", name: "King's Pawn Game" },
  moves: ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"],
  clocks: null,
} satisfies Game

describe("sharing", () => {
  it("writes the result from White's side", () => {
    expect(pgnResult(game)).toBe("1-0")
    expect(pgnResult({ result: "win", userColor: "black" })).toBe("0-1")
    expect(pgnResult({ result: "draw", userColor: "white" })).toBe("1/2-1/2")
  })

  it("builds a PGN other sites can read", () => {
    const pgn = gameToPgn(game)
    expect(pgn).toContain('[White "me"]')
    expect(pgn).toContain('[Result "1-0"]')
    expect(pgn).toContain('[Date "2026.11.02"]')
    expect(pgn).not.toContain("BlackElo")
    expect(pgn).toContain("4. Qxf7# 1-0")
  })

  it("links a position to Lichess's analysis board", () => {
    expect(lichessAnalysisUrl("8/8/8/8/8/8/8/K6k w - - 0 1", "black")).toBe(
      "https://lichess.org/analysis/8/8/8/8/8/8/8/K6k_w_-_-_0_1?color=black",
    )
  })
})
