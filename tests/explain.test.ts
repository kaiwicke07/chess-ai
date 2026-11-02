import { describe, expect, it } from "vitest"

import type { MoveAssessment } from "@/lib/analysis/classify"
import { judge } from "@/lib/analysis/classify"
import { describeMaterial, materialBalance } from "@/lib/chess/material"
import { positionKey } from "@/lib/chess/positionKey"
import { lineFacts } from "@/lib/explain/facts"
import { explainMove } from "@/lib/explain/templates"
import type { Color, Eval, PositionEval } from "@/lib/types"

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

describe("material", () => {
  it("counts each side's material from the FEN", () => {
    expect(materialBalance(START, "white")).toBe(0)
    expect(materialBalance("4k3/5p2/8/8/3N4/8/8/4K3 w - - 0 1", "white")).toBe(2)
    expect(materialBalance("4k3/5p2/8/8/3N4/8/8/4K3 w - - 0 1", "black")).toBe(-2)
  })

  it("names amounts of material", () => {
    expect(describeMaterial(1)).toBe("a pawn")
    expect(describeMaterial(3)).toBe("a piece")
    expect(describeMaterial(4)).toBe("4 points of material")
  })
})

describe("lineFacts", () => {
  it("waits for recaptures before counting material", () => {
    // exd5 cxd5 is an even trade
    const trade = lineFacts("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1", ["e4d5", "c6d5"], "white")
    expect(trade.materialChange).toBe(0)
    expect(trade.settledAt).toBe(2)
    expect(trade.steps.map((s) => s.san)).toEqual(["exd5", "cxd5"])
  })

  it("counts a free capture", () => {
    expect(lineFacts("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", ["e4d5", "e8e7"], "white").materialChange).toBe(1)
  })
})

// Builds the inputs explainMove needs for a single move
function context(fen: string, uci: string, before: { eval: Eval; pv: string[] }, after: { eval: Eval; pv: string[] }) {
  const mover: Color = fen.split(" ")[1] === "w" ? "white" : "black"
  const entry = (e: { eval: Eval; pv: string[] }): PositionEval => ({
    key: positionKey(fen),
    depth: 14,
    eval: e.eval,
    best: e.pv[0] ?? null,
    pv: e.pv,
  })
  const assessment: MoveAssessment = {
    ply: 1,
    color: mover,
    winBefore: 50,
    winAfter: 20,
    best: before.pv[0] === uci,
    accuracy: 10,
    ...judge(before.eval, after.eval, mover),
  }
  return { fen, uci, assessment, before: entry(before), after: entry(after) }
}

describe("explainMove templates", () => {
  it("1. allowed mate shows the mating line", () => {
    // Ra7 leaves the back rank, and Re1 is mate
    const text = explainMove(
      context(
        "4r1k1/8/8/8/8/8/5PPP/R5K1 w - - 0 1",
        "a1a7",
        { eval: { kind: "cp", cp: 0 }, pv: ["g1f1"] },
        { eval: { kind: "mate", moves: -1 }, pv: ["e8e1"] },
      ),
    )
    expect(text).toBe("This allows mate in 1: 1… Re1#.")
  })

  it("2. missed mate shows the mate that was there", () => {
    const text = explainMove(
      context(
        "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
        "g1f1",
        { eval: { kind: "mate", moves: 1 }, pv: ["e1e8"] },
        { eval: { kind: "cp", cp: 400 }, pv: ["g8f8"] },
      ),
    )
    expect(text).toBe("This misses mate in 1: 1. Re8#.")
  })

  it("3. a piece left en prise is called hanging, with the capture", () => {
    // Ne6 walks into fxe6
    const text = explainMove(
      context(
        "4k3/5p2/8/8/3N4/8/8/4K3 w - - 0 1",
        "d4e6",
        { eval: { kind: "cp", cp: 250 }, pv: ["d4f5", "e8d7"] },
        { eval: { kind: "cp", cp: -100 }, pv: ["f7e6", "e1e2"] },
      ),
    )
    expect(text).toBe("This hangs the knight on e6 to fxe6.")
  })

  it("4. a missed capture says what it would have won", () => {
    // The c6 knight was free
    const text = explainMove(
      context(
        "4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1",
        "e1e2",
        { eval: { kind: "cp", cp: 300 }, pv: ["b5c6", "e8d8"] },
        { eval: { kind: "cp", cp: 0 }, pv: ["c6e5", "e2e3"] },
      ),
    )
    expect(text).toBe("Bxc6+ would have won a piece.")
  })

  it("4a. a capture that's answered by a recapture claims no material", () => {
    // Bxc6+ takes the knight but bxc6 takes the bishop back: an even trade
    const text = explainMove(
      context(
        "4k3/1p6/2n5/1B6/8/8/8/4K3 w - - 0 1",
        "e1e2",
        { eval: { kind: "cp", cp: 150 }, pv: ["b5c6", "b7c6", "e1d2"] },
        { eval: { kind: "cp", cp: 0 }, pv: ["c6e5", "e2e3"] },
      ),
    )
    expect(text).toBe("Stockfish prefers Bxc6+. White's evaluation drops from +1.50 to 0.00.")
  })

  it("4b. a slower material win includes the line", () => {
    // Nc7+ forks king and rook; the rook falls a move later
    const text = explainMove(
      context(
        "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
        "e1e2",
        { eval: { kind: "cp", cp: 500 }, pv: ["b5c7", "e8d7", "c7a8", "d7c6"] },
        { eval: { kind: "cp", cp: -480 }, pv: ["a8a5", "b5c3"] },
      ),
    )
    expect(text).toBe("Nc7+ would have won a rook: 1. Nc7+ Kd7 2. Nxa8 Kc6.")
  })

  it("5. otherwise it reports only the evals, from the mover's side", () => {
    const text = explainMove(
      context(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        "f7f6",
        { eval: { kind: "cp", cp: 30 }, pv: ["e7e5", "g1f3"] },
        { eval: { kind: "cp", cp: 120 }, pv: ["d2d4", "e7e5"] },
      ),
    )
    expect(text).toBe("Stockfish prefers e5. Black's evaluation drops from -0.30 to -1.20.")
  })

  it("says nothing about moves that weren't flagged", () => {
    const text = explainMove(
      context(START, "e2e4", { eval: { kind: "cp", cp: 20 }, pv: ["e2e4"] }, { eval: { kind: "cp", cp: 25 }, pv: ["e7e5"] }),
    )
    expect(text).toBeNull()
  })
})
