import { describe, expect, it } from "vitest"

import { clocksAt, replayMoves } from "@/lib/chess/positions"
import { formatClock, formatOutcome, formatScore } from "@/lib/format"

describe("replayMoves", () => {
  it("returns the start plus one position per ply", () => {
    const positions = replayMoves(["e4", "e5", "Nf3"])

    expect(positions).toHaveLength(4)
    expect(positions[0]).toEqual({
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      lastMove: null,
    })
    expect(positions[3].lastMove).toEqual({ san: "Nf3", uci: "g1f3", from: "g1", to: "f3", color: "white" })
    expect(positions[3].fen).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2")
  })

  it("stops at an illegal move instead of throwing", () => {
    expect(replayMoves(["e4", "Ke2"])).toHaveLength(2)
  })
})

describe("clocksAt", () => {
  // 3+0 game: white then black clocks after each ply
  const game = { timeControl: { initial: 180, increment: 0 }, clocks: [180_000, 179_000, 175_000, 170_000] }

  it("shows the starting time for a side that hasn't moved", () => {
    expect(clocksAt(game, 0)).toEqual({ white: 180_000, black: 180_000 })
    expect(clocksAt(game, 1)).toEqual({ white: 180_000, black: 180_000 })
  })

  it("reads each side's clock after its latest move", () => {
    expect(clocksAt(game, 2)).toEqual({ white: 180_000, black: 179_000 })
    expect(clocksAt(game, 3)).toEqual({ white: 175_000, black: 179_000 })
    expect(clocksAt(game, 4)).toEqual({ white: 175_000, black: 170_000 })
  })

  it("returns null without clock data", () => {
    expect(clocksAt({ ...game, clocks: null }, 2)).toBeNull()
  })
})

describe("game formatting", () => {
  it("formats clocks", () => {
    expect(formatClock(179_300)).toBe("2:59")
    expect(formatClock(9_350)).toBe("0:09.3")
    expect(formatClock(3_723_000)).toBe("1:02:03")
    expect(formatClock(-500)).toBe("0:00.0")
  })

  it("describes the outcome from the user's side", () => {
    expect(formatOutcome({ result: "win", termination: "resignation" })).toBe("You won by resignation")
    expect(formatOutcome({ result: "loss", termination: "timeout" })).toBe("You lost on time")
    expect(formatOutcome({ result: "draw", termination: "draw" })).toBe("Draw")
  })

  it("converts results to a white-first score", () => {
    expect(formatScore({ result: "win", userColor: "black" })).toBe("0-1")
    expect(formatScore({ result: "loss", userColor: "black" })).toBe("1-0")
    expect(formatScore({ result: "draw", userColor: "white" })).toBe("½-½")
  })
})
