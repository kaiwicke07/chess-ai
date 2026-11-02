import { describe, expect, it } from "vitest"

import { positionKey } from "@/lib/chess/positionKey"
import { replayMoves } from "@/lib/chess/positions"
import { buildTree, movesByCount } from "@/lib/openings/buildTree"
import { findWeakSpots, moveQualities } from "@/lib/openings/deviations"
import { knownVerdict, verdictFromEval } from "@/lib/openings/drill"
import type { Eval, Game, PositionEval, Result } from "@/lib/types"

const game = (moves: string[], userColor: "white" | "black" = "white", result: Result = "win") =>
  ({ moves, userColor, result }) as Game

const key = (moves: string[]) => positionKey(replayMoves(moves).at(-1)!.fen)

describe("buildTree", () => {
  it("counts games and moves per position", () => {
    const tree = buildTree(
      [game(["e4", "e5", "Nf3"]), game(["e4", "e5", "Bc4"], "white", "loss"), game(["d4", "d5"])],
      "white",
    )
    const root = tree.nodes.get(tree.root)!
    expect(root.games).toBe(3)
    expect(movesByCount(root).map((m) => [m.san, m.count])).toEqual([
      ["e4", 2],
      ["d4", 1],
    ])
    const afterE5 = tree.nodes.get(key(["e4", "e5"]))!
    expect(afterE5.games).toBe(2)
    expect(afterE5.toMove).toBe("white")
    expect(afterE5.moves.get("f1c4")?.results).toEqual({ win: 0, draw: 0, loss: 1 })
  })

  it("merges transpositions into one node", () => {
    const tree = buildTree([game(["d4", "Nf6", "c4", "e6"]), game(["c4", "e6", "d4", "Nf6"])], "white")
    const merged = tree.nodes.get(key(["d4", "Nf6", "c4", "e6"]))!
    expect(merged.games).toBe(2)
  })

  it("only uses games played with the chosen color, up to the opening depth", () => {
    const tree = buildTree([game(["e4", "e5", "Nf3", "Nc6"], "black"), game(["e4", "c5", "Nf3", "d6", "d4"])], "white", 2)
    expect(tree.nodes.get(tree.root)!.games).toBe(1)
    expect(tree.nodes.has(key(["e4", "c5", "Nf3"]))).toBe(false)
  })

  it("remembers the shortest route to each node", () => {
    const tree = buildTree([game(["e4", "e5", "Nf3"])], "white")
    expect(tree.nodes.get(key(["e4", "e5"]))!.path).toEqual(["e2e4", "e7e5"])
  })
})

describe("findWeakSpots", () => {
  const cp = (value: number): Eval => ({ kind: "cp", cp: value })
  const entry = (moves: string[], evaluation: Eval, best: string | null): [string, PositionEval] => [
    key(moves),
    { key: key(moves), depth: 14, eval: evaluation, best, pv: best ? [best] : [] },
  ]

  // 1. e4 e5: three games; twice you played the weak 2. Qh5?!, once the good 2. Nf3
  const games = [
    game(["e4", "e5", "Qh5"]),
    game(["e4", "e5", "Qh5"], "white", "loss"),
    game(["e4", "e5", "Nf3"]),
    game(["d4", "d5", "Bf4"]), // reached once: never a weak spot
  ]
  const evals = new Map([
    entry([], cp(30), "e2e4"),
    entry(["e4"], cp(30), "e7e5"),
    entry(["e4", "e5"], cp(40), "g1f3"),
    entry(["e4", "e5", "Qh5"], cp(-150), "b8c6"), // costs about 17 win %
    entry(["e4", "e5", "Nf3"], cp(35), "b8c6"),
    entry(["d4"], cp(20), "d7d5"),
    entry(["d4", "d5"], cp(25), "c2c4"),
    entry(["d4", "d5", "Bf4"], cp(-400), "c7c5"),
  ])

  it("finds positions you reach repeatedly and leave with a costly move", () => {
    const [spot, ...rest] = findWeakSpots(buildTree(games, "white"), evals, "lichess:me")

    expect(rest).toHaveLength(0)
    expect(spot.pathSan).toEqual(["e4", "e5"])
    expect(spot.best).toEqual({ uci: "g1f3", san: "Nf3" })
    expect(spot.badMoves.map((m) => [m.san, m.count])).toEqual([["Qh5", 2]])
    expect(spot.badMoves[0].loss).toBeGreaterThan(15)
    expect(spot.acceptable.sort()).toEqual(["g1f3"])
    expect(spot.id).toBe(`lichess:me:white:${key(["e4", "e5"])}`)
  })

  it("carries Stockfish's main line for after the drill", () => {
    const [spot] = findWeakSpots(buildTree(games, "white"), evals, "lichess:me")
    expect(spot.line).toEqual(["2. Nf3"])
  })

  it("judges drill moves from known moves, then from a fresh eval", () => {
    const [spot] = findWeakSpots(buildTree(games, "white"), evals, "lichess:me")
    expect(knownVerdict(spot, "g1f3")).toBe("good")
    expect(knownVerdict(spot, "d1h5")).toBe("bad")
    expect(knownVerdict(spot, "b1c3")).toBe("unknown")
    // 2. Nc3 keeps +0.30 against +0.40 with best play: fine. −1.00 isn't
    expect(verdictFromEval(spot, cp(30))).toBe("good")
    expect(verdictFromEval(spot, cp(-100))).toBe("bad")
  })

  it("ranks by how often times how costly", () => {
    const tree = buildTree([...games, game(["e4", "e5", "Qh5"])], "white")
    expect(findWeakSpots(tree, evals, "lichess:me")[0].score).toBeGreaterThan(
      findWeakSpots(buildTree(games, "white"), evals, "lichess:me")[0].score,
    )
  })

  it("needs evals on both sides of a move", () => {
    const node = buildTree(games, "white").nodes.get(key(["e4", "e5"]))!
    const partial = new Map([entry(["e4", "e5"], cp(40), "g1f3")])
    expect(moveQualities(node, partial)).toEqual([])
    expect(moveQualities(node, new Map())).toBeNull()
  })
})
