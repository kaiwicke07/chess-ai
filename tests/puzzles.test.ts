import { describe, expect, it } from "vitest"

import { positionKey } from "@/lib/chess/positionKey"
import type { UciInfo } from "@/lib/engine/uci"
import { buildSolution } from "@/lib/puzzles/generate"
import { advance, awaitingReply, checkMove, fenAt, outcomeOf, START, userMove } from "@/lib/puzzles/solve"
import { isFork, tagThemes } from "@/lib/puzzles/themes"
import type { Puzzle } from "@/lib/types"

/** A fake engine that answers from a table keyed by position. */
function fakeEngine(answers: Record<string, UciInfo[]>) {
  const asked: string[] = []
  return {
    asked,
    analyze: async (fen: string) => {
      asked.push(positionKey(fen))
      return answers[positionKey(fen)] ?? []
    },
  }
}
const line = (cp: number | { mate: number }, pv: string[], multipv = 1): UciInfo => ({
  depth: 18,
  multipv,
  score: typeof cp === "number" ? { type: "cp", value: cp } : { type: "mate", value: cp.mate },
  pv,
})

// White to move: Bxc6+ wins a free knight; Ke2 is the quiet alternative
const FREE_KNIGHT = "4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1"

describe("buildSolution", () => {
  it("keeps a position whose best move clearly beats the second best", async () => {
    const engine = fakeEngine({
      [positionKey(FREE_KNIGHT)]: [line(320, ["b5c6", "e8d8"]), line(0, ["e1e2"], 2)],
    })
    // Bxc6+ cashes in a piece, so the puzzle ends there
    expect((await buildSolution(engine, FREE_KNIGHT, "white"))?.moves).toEqual(["b5c6"])
  })

  it("rejects a position with two similar moves", async () => {
    const engine = fakeEngine({
      [positionKey(FREE_KNIGHT)]: [line(320, ["b5c6"]), line(280, ["b5d7"], 2)],
    })
    expect(await buildSolution(engine, FREE_KNIGHT, "white")).toBeNull()
  })

  it("rejects decided positions, where both moves win anyway", async () => {
    const engine = fakeEngine({
      [positionKey(FREE_KNIGHT)]: [line(2500, ["b5c6"]), line(1400, ["e1e2"], 2)],
    })
    expect(await buildSolution(engine, FREE_KNIGHT, "white")).toBeNull()
  })

  it("rejects a forced only-move position", async () => {
    const engine = fakeEngine({ [positionKey(FREE_KNIGHT)]: [line(0, ["e1e2"])] })
    expect(await buildSolution(engine, FREE_KNIGHT, "white")).toBeNull()
  })

  it("extends a fork into a multi-move line while each move stays unique", async () => {
    // Nc7+ forks king and rook, Kd7 Nxa8 wins the rook
    const start = "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1"
    const afterKd7 = "r7/2Nk4/8/8/8/8/8/4K3 w - - 2 2"
    const engine = fakeEngine({
      [positionKey(start)]: [line(480, ["b5c7", "e8d7"]), line(0, ["e1e2"], 2)],
      [positionKey(afterKd7)]: [line(500, ["c7a8", "d7c6"]), line(150, ["e1e2"], 2)],
    })
    expect((await buildSolution(engine, start, "white"))?.moves).toEqual(["b5c7", "e8d7", "c7a8"])
  })

  it("stops before a move that isn't unique and still ends on the user's move", async () => {
    const start = "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1"
    const afterKd7 = "r7/2Nk4/8/8/8/8/8/4K3 w - - 2 2"
    const engine = fakeEngine({
      [positionKey(start)]: [line(480, ["b5c7", "e8d7"]), line(0, ["e1e2"], 2)],
      [positionKey(afterKd7)]: [line(500, ["c7a8"]), line(490, ["e1d2"], 2)],
    })
    expect((await buildSolution(engine, start, "white"))?.moves).toEqual(["b5c7"])
  })

  it("accepts a mate when the alternative isn't one", async () => {
    const backRank = "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1"
    const engine = fakeEngine({
      [positionKey(backRank)]: [line({ mate: 1 }, ["e1e8"]), line(400, ["g1f1"], 2)],
    })
    expect((await buildSolution(engine, backRank, "white"))?.moves).toEqual(["e1e8"])
  })

  it("rejects a position with two different mates", async () => {
    const backRank = "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1"
    const engine = fakeEngine({
      [positionKey(backRank)]: [line({ mate: 1 }, ["e1e8"]), line({ mate: 3 }, ["g1f1"], 2)],
    })
    expect(await buildSolution(engine, backRank, "white")).toBeNull()
  })

  it("keeps a defensive only-move as a one-move puzzle", async () => {
    const engine = fakeEngine({
      [positionKey(FREE_KNIGHT)]: [line(0, ["e1d2", "c6d4"]), line(-400, ["e1f2"], 2)],
    })
    const found = await buildSolution(engine, FREE_KNIGHT, "white")
    expect(found).toEqual({ moves: ["e1d2"], win: 50 })
  })
})

describe("solving", () => {
  const puzzle = (fen: string, solution: string[]): Puzzle => ({
    id: "lichess:x:10",
    gameId: "lichess:x",
    account: "lichess:me",
    ply: 10,
    fen,
    color: "white",
    solution,
    themes: [],
    mateIn: null,
    previousMove: null,
    played: { uci: "e1e2", san: "Ke2", judgement: "blunder" },
    createdAt: 0,
  })
  const fork = puzzle("r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", ["b5c7", "e8d7", "c7a8"])

  it("walks a multi-move solution, with the opponent's reply in between", () => {
    let { state } = userMove(START, fork, "b5c7")
    expect(state).toMatchObject({ step: 1, status: "playing" })
    expect(awaitingReply(state, fork)).toBe(true)
    state = advance(state)
    expect(fenAt(fork, state.step)).toBe("r7/2Nk4/8/8/8/8/8/4K3 w - - 2 2")
    state = userMove(state, fork, "c7a8").state
    expect(state.status).toBe("solved")
    expect(outcomeOf(state)).toBe("clean")
  })

  it("counts wrong moves and lets the user retry", () => {
    const wrong = userMove(START, fork, "e1e2")
    expect(wrong.played).toBeNull()
    expect(wrong.state).toMatchObject({ step: 0, mistakes: 1, status: "playing" })
    const right = userMove(wrong.state, fork, "b5c7")
    expect(right.state.step).toBe(1)
  })

  it("grades attempts for spaced repetition", () => {
    expect(outcomeOf({ ...START, status: "solved", hintUsed: true })).toBe("hinted")
    expect(outcomeOf({ ...START, status: "solved", mistakes: 2 })).toBe("retried")
    expect(outcomeOf({ ...START, status: "failed" })).toBe("failed")
    expect(outcomeOf(START)).toBeNull()
  })

  it("accepts any checkmate, not just the stored one", () => {
    // Back-rank position where Qa8# and Re8# both mate; the stored answer is Qa8#
    const twoMates = puzzle("6k1/5ppp/8/8/8/8/8/Q3R1K1 w - - 0 1", ["a1a8"])
    expect(checkMove(twoMates, 0, "a1a8")).toBe("a1a8")
    expect(checkMove(twoMates, 0, "e1e8")).toBe("e1e8")
    expect(userMove(START, twoMates, "e1e8").state.status).toBe("solved")
    expect(checkMove(twoMates, 0, "a1b1")).toBeNull()
  })

  it("accepts the board's auto-queen for an underpromotion", () => {
    const knight = puzzle("8/1P2k3/8/8/8/8/8/4K3 w - - 0 1", ["b7b8n"])
    expect(checkMove(knight, 0, "b7b8q")).toBe("b7b8n")
  })
})

describe("tagThemes", () => {
  it("tags mates with their length", () => {
    expect(tagThemes("6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", ["e1e8"], "white", 80)).toEqual({ themes: ["mate"], mateIn: 1 })
  })

  it("tags a free capture as a hanging piece and a material win", () => {
    expect(tagThemes(FREE_KNIGHT, ["b5c6"], "white", 80).themes).toEqual(["hangingPiece", "material"])
  })

  it("tags a knight fork", () => {
    expect(tagThemes("r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", ["b5c7", "e8d7", "c7a8"], "white", 80).themes).toEqual([
      "fork",
      "material",
    ])
  })

  it("falls back to advantage or defense by how good the position is", () => {
    expect(tagThemes(FREE_KNIGHT, ["e1d2"], "white", 80).themes).toEqual(["advantage"])
    expect(tagThemes(FREE_KNIGHT, ["e1d2"], "white", 45).themes).toEqual(["defense"])
  })

  it("only counts fork targets worth more than the forking piece", () => {
    // Knight on c7 hits the king on e8 and the rook on a8
    expect(isFork("r3k3/2N5/8/8/8/8/8/4K3 b - - 1 1", "c7", "white")).toBe(true)
    // A queen attacking two knights isn't a fork
    expect(isFork("4k3/8/1n3n2/8/3Q4/8/8/4K3 b - - 1 1", "d4", "white")).toBe(false)
  })
})
