import { describe, expect, it } from "vitest"

import { gameAccuracy } from "@/lib/analysis/accuracy"
import type { MoveAssessment } from "@/lib/analysis/classify"
import { replayUci } from "@/lib/chess/positions"
import { criticalPly } from "@/lib/replay/criticalPosition"
import { replayOutcome } from "@/lib/replay/outcome"

describe("replayOutcome", () => {
  it("scores checkmate from the user's side", () => {
    const backRank = "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1"
    expect(replayOutcome(backRank, ["e1e8"], "white")).toEqual({ result: "win", reason: "checkmate" })
    expect(replayOutcome(backRank, ["e1e8"], "black")).toEqual({ result: "loss", reason: "checkmate" })
    expect(replayOutcome(backRank, [], "white")).toBeNull()
  })

  it("sees threefold repetition across the replay's moves", () => {
    const start = "4k3/8/8/8/8/8/8/R3K3 w - - 0 1"
    const shuffle = ["a1a2", "e8d8", "a2a1", "d8e8"]
    expect(replayOutcome(start, shuffle, "white")).toBeNull()
    expect(replayOutcome(start, [...shuffle, ...shuffle], "white")).toEqual({ result: "draw", reason: "repetition" })
  })

  it("detects stalemate and insufficient material", () => {
    expect(replayOutcome("7k/8/6Q1/8/8/8/8/6K1 w - - 0 1", ["g6f7"], "white")).toEqual({ result: "draw", reason: "stalemate" })
    expect(replayOutcome("4k3/8/8/8/8/8/3r4/4K3 w - - 0 1", ["e1d2"], "white")).toEqual({
      result: "draw",
      reason: "insufficient material",
    })
  })
})

describe("replayUci", () => {
  it("plays UCI moves from any position", () => {
    const positions = replayUci("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", ["e2e4", "e8d7", "e4e5"])
    expect(positions).toHaveLength(4)
    expect(positions.map((p) => p.lastMove?.san ?? null)).toEqual([null, "e4", "Kd7", "e5"])
    expect(positions[2].lastMove?.color).toBe("black")
  })
})

describe("gameAccuracy with black moving first", () => {
  it("credits the first move to black", () => {
    // Black's first move drops black's position badly; white's reply is fine
    const evals = [
      { kind: "cp" as const, cp: 0 },
      { kind: "cp" as const, cp: 400 },
      { kind: "cp" as const, cp: 400 },
    ]
    const accuracy = gameAccuracy(evals, "black")
    expect(accuracy.black!).toBeLessThan(50)
    expect(accuracy.white).toBe(100)
  })
})

const move = (ply: number, color: "white" | "black", winBefore: number, winAfter: number) =>
  ({ ply, color, winBefore, winAfter }) as MoveAssessment

describe("criticalPly", () => {
  it("starts before the user's costliest move", () => {
    const assessments = [
      null,
      move(1, "white", 52, 50),
      move(2, "black", 50, 48), // the opponent's moves don't count
      move(3, "white", 52, 30), // −22
      move(4, "black", 70, 20),
      move(5, "white", 80, 65), // −15
    ]
    // The −22 move led to position 3, so the replay starts at position 2
    expect(criticalPly(assessments, "white")).toBe(2)
  })

  it("returns null when the user never dropped 10 points", () => {
    expect(criticalPly([null, move(1, "white", 55, 50), move(2, "black", 50, 10)], "white")).toBeNull()
  })

  it("handles unanalyzed games", () => {
    expect(criticalPly([null, null, null], "black")).toBeNull()
  })
})
