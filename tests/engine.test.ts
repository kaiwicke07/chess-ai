import { describe, expect, it } from "vitest"

import { formatEval, winPercent } from "@/lib/analysis/winProbability"
import { positionKey } from "@/lib/chess/positionKey"
import { numberMoves, uciLineToSan } from "@/lib/chess/san"
import { evaluatePosition, terminalEval, toWhiteEval } from "@/lib/engine/analyzeGame"
import type { Engine } from "@/lib/engine/engine"
import { parseInfo, type UciInfo } from "@/lib/engine/uci"

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
// Fool's mate: white is checkmated
const FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

describe("parseInfo", () => {
  it("reads depth, multipv, score and line", () => {
    const line =
      "info depth 14 seldepth 19 multipv 2 score cp -35 nodes 41234 nps 812000 hashfull 12 time 51 pv e7e5 g1f3 b8c6"
    expect(parseInfo(line)).toEqual({ depth: 14, multipv: 2, score: { type: "cp", value: -35 }, pv: ["e7e5", "g1f3", "b8c6"] })
  })

  it("reads mate scores and defaults multipv to 1", () => {
    expect(parseInfo("info depth 9 score mate -3 pv h7h6")).toMatchObject({ multipv: 1, score: { type: "mate", value: -3 } })
  })

  it("ignores info lines without a scored line", () => {
    expect(parseInfo("info depth 10 currmove e2e4 currmovenumber 1")).toBeNull()
    expect(parseInfo("info string NNUE evaluation using nn-small.nnue")).toBeNull()
    expect(parseInfo("bestmove e2e4 ponder e7e5")).toBeNull()
  })
})

describe("engine scores to white's point of view", () => {
  const info = (score: UciInfo["score"]): UciInfo => ({ depth: 14, multipv: 1, score, pv: [] })

  it("keeps white-to-move scores and flips black-to-move scores", () => {
    expect(toWhiteEval(info({ type: "cp", value: 40 }), true)).toEqual({ kind: "cp", cp: 40 })
    expect(toWhiteEval(info({ type: "cp", value: 40 }), false)).toEqual({ kind: "cp", cp: -40 })
    expect(toWhiteEval(info({ type: "mate", value: 2 }), false)).toEqual({ kind: "mate", moves: -2 })
  })

  it("scores finished games without the engine", () => {
    expect(terminalEval(FOOLS_MATE)).toEqual({ kind: "checkmate", winner: "black" })
    expect(terminalEval("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).toEqual({ kind: "cp", cp: 0 }) // stalemate
    expect(terminalEval(START)).toBeNull()
  })

  it("evaluatePosition flips the engine's score when black is to move", async () => {
    const fakeEngine = {
      analyze: async () => [{ depth: 14, multipv: 1, score: { type: "cp", value: 30 }, pv: ["e7e5", "g1f3"] }],
    } as unknown as Engine

    expect(await evaluatePosition(fakeEngine, AFTER_E4, 14)).toEqual({
      key: positionKey(AFTER_E4),
      depth: 14,
      eval: { kind: "cp", cp: -30 },
      best: "e7e5",
      pv: ["e7e5", "g1f3"],
    })
  })

  it("evaluatePosition never asks the engine about a checkmate", async () => {
    const throwingEngine = {
      analyze: async () => {
        throw new Error("should not be called")
      },
    } as unknown as Engine
    expect((await evaluatePosition(throwingEngine, FOOLS_MATE, 14)).eval).toEqual({ kind: "checkmate", winner: "black" })
  })
})

describe("winPercent", () => {
  it("is 50 at equality and symmetric", () => {
    expect(winPercent({ kind: "cp", cp: 0 })).toBe(50)
    expect(winPercent({ kind: "cp", cp: 300 }) + winPercent({ kind: "cp", cp: -300 })).toBeCloseTo(100)
  })

  it("follows Lichess's curve: a pawn up is about 59%, three pawns about 75%", () => {
    expect(winPercent({ kind: "cp", cp: 100 })).toBeCloseTo(59.1, 1)
    expect(winPercent({ kind: "cp", cp: 300 })).toBeCloseTo(75.1, 1)
  })

  it("scores mates like Lichess, as ±1000 cp (about 97.5%)", () => {
    const ceiling = winPercent({ kind: "cp", cp: 1000 })
    expect(ceiling).toBeCloseTo(97.5, 1)
    expect(winPercent({ kind: "mate", moves: 3 })).toBe(ceiling)
    expect(winPercent({ kind: "mate", moves: -1 })).toBeCloseTo(100 - ceiling)
    expect(winPercent({ kind: "checkmate", winner: "black" })).toBeCloseTo(100 - ceiling)
    expect(winPercent({ kind: "cp", cp: 5000 })).toBe(ceiling)
  })

  it("formats evals", () => {
    expect(formatEval({ kind: "cp", cp: 135 })).toBe("+1.35")
    expect(formatEval({ kind: "cp", cp: -50 })).toBe("-0.50")
    expect(formatEval({ kind: "mate", moves: -2 })).toBe("-M2")
    expect(formatEval({ kind: "checkmate", winner: "white" })).toBe("#")
  })
})

describe("SAN helpers", () => {
  it("converts UCI lines to SAN, including castling and promotion", () => {
    expect(uciLineToSan(START, ["e2e4", "e7e5", "g1f3"])).toEqual(["e4", "e5", "Nf3"])
    expect(uciLineToSan("4k3/P7/8/8/8/8/8/4K3 w - - 0 1", ["a7a8q"])).toEqual(["a8=Q+"])
    expect(uciLineToSan("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["e1g1"])).toEqual(["O-O"])
  })

  it("stops at the first illegal move", () => {
    expect(uciLineToSan(START, ["e2e4", "e2e4"])).toEqual(["e4"])
  })

  it("numbers moves like a book", () => {
    expect(numberMoves(START, ["e4", "e5", "Nf3"])).toEqual(["1. e4", "e5", "2. Nf3"])
    expect(numberMoves(AFTER_E4, ["e5", "Nf3"])).toEqual(["1… e5", "2. Nf3"])
  })

  it("keys positions without move counters", () => {
    expect(positionKey(START)).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -")
  })
})
