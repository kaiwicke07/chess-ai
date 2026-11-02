import { describe, expect, it } from "vitest"

import { gameAccuracy, moveAccuracy } from "@/lib/analysis/accuracy"
import { assessMoves, judge } from "@/lib/analysis/classify"
import { positionKey } from "@/lib/chess/positionKey"
import { replayMoves } from "@/lib/chess/positions"
import type { Eval, PositionEval } from "@/lib/types"
import analysedGames from "./fixtures/lichess-analysed.json"

const cp = (value: number): Eval => ({ kind: "cp", cp: value })
const mate = (moves: number): Eval => ({ kind: "mate", moves })

describe("judge: win-% drops (Lichess CpAdvice)", () => {
  it("uses 5/10/15 point drops in the mover's win chance", () => {
    expect(judge(cp(0), cp(-50), "white").judgement).toBeNull() // −4.6
    expect(judge(cp(0), cp(-100), "white").judgement).toBe("inaccuracy") // −9.1
    expect(judge(cp(0), cp(-150), "white").judgement).toBe("mistake") // −13.5
    expect(judge(cp(0), cp(-200), "white").judgement).toBe("blunder") // −17.6
  })

  it("judges black from black's side", () => {
    expect(judge(cp(0), cp(200), "black").judgement).toBe("blunder")
    expect(judge(cp(0), cp(-200), "black").judgement).toBeNull()
  })

  it("forgives big cp swings in decided positions", () => {
    // +8 to +5: still winning easily, only an inaccuracy (−8.7)
    expect(judge(cp(800), cp(500), "white").judgement).toBe("inaccuracy")
    expect(judge(cp(1500), cp(1100), "white").judgement).toBeNull()
  })

  it("judges on uncapped scores, unlike win % (a real Lichess case: −7.27 → −18.92)", () => {
    expect(judge(cp(-727), cp(-1892), "white").judgement).toBe("inaccuracy")
  })
})

describe("judge: forced mates (Lichess MateAdvice)", () => {
  it("flags allowing a forced mate, less harshly when already lost", () => {
    expect(judge(cp(30), mate(-3), "white")).toEqual({ judgement: "blunder", mate: "allowed" })
    expect(judge(cp(-800), mate(-3), "white")).toEqual({ judgement: "mistake", mate: "allowed" })
    expect(judge(cp(-1200), mate(-3), "white")).toEqual({ judgement: "inaccuracy", mate: "allowed" })
    expect(judge(cp(-30), mate(3), "black")).toEqual({ judgement: "blunder", mate: "allowed" })
  })

  it("flags losing a forced mate, less harshly when still winning", () => {
    expect(judge(mate(2), cp(300), "white")).toEqual({ judgement: "blunder", mate: "lost" })
    expect(judge(mate(2), cp(800), "white")).toEqual({ judgement: "mistake", mate: "lost" })
    expect(judge(mate(2), cp(1200), "white")).toEqual({ judgement: "inaccuracy", mate: "lost" })
    expect(judge(mate(2), mate(-1), "white")).toEqual({ judgement: "blunder", mate: "lost" })
  })

  it("never flags a slower mate, an escape, or delivering checkmate", () => {
    expect(judge(mate(2), mate(4), "white").judgement).toBeNull()
    expect(judge(mate(-2), cp(-300), "white").judgement).toBeNull()
    expect(judge(mate(1), { kind: "checkmate", winner: "white" }, "white").judgement).toBeNull()
  })
})

describe("moveAccuracy", () => {
  it("is 100 when the move loses nothing", () => {
    expect(moveAccuracy(50, 50)).toBe(100)
    expect(moveAccuracy(50, 60)).toBe(100)
  })

  it("follows Lichess's curve, including the 1-point bonus", () => {
    expect(moveAccuracy(60, 50)).toBeCloseTo(64.58, 1)
    expect(moveAccuracy(90, 10)).toBeCloseTo(1.0, 1)
    expect(moveAccuracy(100, 0)).toBe(0)
  })
})

describe("assessMoves", () => {
  const positions = replayMoves(["e4", "e5", "Qh5"])
  const entry = (index: number, evaluation: Eval, best: string): PositionEval => ({
    key: positionKey(positions[index].fen),
    depth: 14,
    eval: evaluation,
    best,
    pv: [best],
  })

  it("aligns with positions and marks engine-best moves", () => {
    const evals = [entry(0, cp(20), "e2e4"), entry(1, cp(25), "c7c5"), entry(2, cp(30), "g1f3"), undefined]
    const assessed = assessMoves(positions, evals)

    expect(assessed).toHaveLength(4)
    expect(assessed[0]).toBeNull()
    expect(assessed[1]).toMatchObject({ ply: 1, color: "white", best: true, judgement: null })
    expect(assessed[2]).toMatchObject({ ply: 2, color: "black", best: false, judgement: null })
    expect(assessed[3]).toBeNull() // position after Qh5 isn't analyzed yet
  })
})

/**
 * The strongest check: feed Lichess's own evals for real games into our port
 * and require Lichess's own verdicts. Exported analysis starts after move 1, so
 * the start is assumed to be +0.15 (Lichess's legacy initial eval).
 */
describe("matches Lichess on real analysed games", () => {
  for (const game of analysedGames) {
    const evals: Eval[] = [cp(15), ...game.analysis.map((a) => ("mate" in a ? mate(a.mate!) : cp(a.eval!)))]
    // The export has no entry for a final checkmate position
    const plies = game.moves.split(" ").length
    if (game.status === "mate" && evals.length === plies) {
      evals.push({ kind: "checkmate", winner: game.winner as "white" | "black" })
    }

    it(`${game.id}: same judgement on every move`, () => {
      const ours = evals.slice(1).map((after, i) => judge(evals[i], after, i % 2 === 0 ? "white" : "black").judgement)
      const theirs = game.analysis.map((a) => (a.judgment ? a.judgment.toLowerCase() : null))
      expect(ours.slice(0, theirs.length)).toEqual(theirs)
    })

    it(`${game.id}: same accuracy for both players (±1, Lichess rounds)`, () => {
      const accuracy = gameAccuracy(evals)
      expect(Math.abs(accuracy.white! - game.accuracy.white)).toBeLessThanOrEqual(1)
      expect(Math.abs(accuracy.black! - game.accuracy.black)).toBeLessThanOrEqual(1)
    })
  }
})
