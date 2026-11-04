import { describe, expect, it } from "vitest"

import { BOTS, pickSampledMove, scoreValue } from "@/lib/bots/bots"
import { coachMove } from "@/lib/bots/coach"
import type { UciInfo } from "@/lib/engine/uci"
import type { PositionEval } from "@/lib/types"

/** A seeded generator, so sampling tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

const style = { kind: "sampled", depth: 6, candidates: 3, temperature: 100, randomChance: 0 } as const
const lines: Pick<UciInfo, "score" | "pv">[] = [
  { score: { type: "cp", value: 50 }, pv: ["e2e4"] },
  { score: { type: "cp", value: 30 }, pv: ["d2d4"] },
  { score: { type: "cp", value: -400 }, pv: ["f2f3"] },
]
const legal = ["e2e4", "d2d4", "f2f3", "g2g4"]

describe("bots", () => {
  it("are listed weakest first", () => {
    const ratings = BOTS.map((b) => b.rating)
    expect([...ratings].sort((a, b) => a - b)).toEqual(ratings)
  })

  it("ranks mates above any material, sooner mates higher", () => {
    expect(scoreValue({ type: "mate", value: 1 })).toBeGreaterThan(scoreValue({ type: "mate", value: 3 }))
    expect(scoreValue({ type: "mate", value: 3 })).toBeGreaterThan(scoreValue({ type: "cp", value: 5000 }))
    expect(scoreValue({ type: "mate", value: -5 })).toBeGreaterThan(scoreValue({ type: "mate", value: -1 }))
  })

  it("mostly picks good moves and rarely a bad one", () => {
    const random = seeded(1)
    const counts = new Map<string, number>()
    for (let i = 0; i < 2000; i++) {
      const move = pickSampledMove([...lines], legal, style, random)!
      counts.set(move, (counts.get(move) ?? 0) + 1)
    }
    expect(counts.get("e2e4")! + counts.get("d2d4")!).toBeGreaterThan(1950)
    expect(counts.get("e2e4")!).toBeGreaterThan(counts.get("d2d4")!)
    expect(counts.get("g2g4")).toBeUndefined()
  })

  it("sometimes plays any legal move, as configured", () => {
    const random = seeded(7)
    const moves = new Set<string>()
    for (let i = 0; i < 500; i++) moves.add(pickSampledMove([...lines], legal, { ...style, randomChance: 0.5 }, random)!)
    expect(moves.has("g2g4")).toBe(true)
  })

  it("ignores engine lines that aren't legal and handles no moves", () => {
    expect(pickSampledMove([{ score: { type: "cp", value: 0 }, pv: ["a1a8"] }], ["e2e4"], style, seeded(3))).toBe("e2e4")
    expect(pickSampledMove([], [], style, seeded(3))).toBeNull()
  })
})

describe("coachMove", () => {
  // White's queen walks into the king: Qd7+?? Kxd7
  const fen = "4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1"
  const before: PositionEval = { key: "b", depth: 14, eval: { kind: "cp", cp: 900 }, best: "d2g5", pv: ["d2g5"] }
  const after: PositionEval = { key: "a", depth: 14, eval: { kind: "cp", cp: 0 }, best: "e8d7", pv: ["e8d7"] }

  it("stops a blunder and explains it from the engine line", () => {
    const verdict = coachMove({ fen, uci: "d2d7", before, after, color: "white", ply: 1, level: "mistakes" })
    expect(verdict.stop).toBe(true)
    expect(verdict.assessment.judgement).toBe("blunder")
    expect(verdict.san).toBe("Qd7+")
    expect(verdict.explanation).toBe("This hangs the queen on d7 to Kxd7.")
    expect(verdict.refutation).toEqual({ uci: "e8d7", san: "Kxd7" })
    expect(verdict.best?.san).toBe("Qg5")
  })

  it("lets the move through when the coach is off", () => {
    expect(coachMove({ fen, uci: "d2d7", before, after, color: "white", ply: 1, level: "off" }).stop).toBe(false)
  })

  it("passes the best move without a stop", () => {
    const fine: PositionEval = { ...after, eval: { kind: "cp", cp: 900 } }
    const verdict = coachMove({ fen, uci: "d2g5", before, after: fine, color: "white", ply: 1, level: "all" })
    expect(verdict.stop).toBe(false)
    expect(verdict.assessment.best).toBe(true)
  })
})
