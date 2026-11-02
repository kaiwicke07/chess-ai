import { describe, expect, it } from "vitest"

import { byOpening, byPhase, byPressure, errorRates, weeklyTrends, weekStart } from "@/lib/stats/aggregate"
import { inTimePressure, openingFamily, phaseOf, type GameStats, type MoveStat } from "@/lib/stats/gameStats"
import type { ReviewLog } from "@/lib/types"

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

describe("phaseOf", () => {
  it("calls the first 20 plies the opening", () => {
    expect(phaseOf(START, 1)).toBe("opening")
    expect(phaseOf(START, 20)).toBe("opening")
    expect(phaseOf(START, 21)).toBe("middlegame")
  })

  it("calls it an endgame once non-pawn material is low", () => {
    // Rook and bishop each: 16 points
    expect(phaseOf("4k3/pp3b1r/8/8/8/8/PP3B1R/4K3 w - - 0 40", 79)).toBe("endgame")
    // Both queens still on: 28 points
    expect(phaseOf("3qk3/pp5r/8/8/8/8/PP5R/3QK3 w - - 0 30", 59)).toBe("middlegame")
  })
})

describe("inTimePressure", () => {
  it("uses 30 seconds or 10% of the starting time, whichever comes first", () => {
    expect(inTimePressure(29_000, 180)).toBe(true) // 3+0: under 30 s
    expect(inTimePressure(31_000, 180)).toBe(false)
    expect(inTimePressure(55_000, 600)).toBe(true) // 10+0: 10% is 60 s
    expect(inTimePressure(65_000, 600)).toBe(false)
  })
})

describe("openingFamily", () => {
  it("groups Lichess and Chess.com names for the same family", () => {
    expect(openingFamily("Caro-Kann Defense: Advance Variation")).toBe("Caro Kann")
    expect(openingFamily("Caro Kann Defense Advance Variation")).toBe("Caro Kann")
    expect(openingFamily("King's Indian Defense: Classical")).toBe("Kings Indian")
    expect(openingFamily("Kings Indian Defense")).toBe("Kings Indian")
    expect(openingFamily("Sicilian Defense: Najdorf Variation")).toBe("Sicilian Defense")
    expect(openingFamily("Sicilian Defense Canal Attack")).toBe("Sicilian Defense")
    expect(openingFamily(null)).toBe("Unknown opening")
  })
})

const move = (overrides: Partial<MoveStat>): MoveStat => ({
  ply: 25,
  phase: "middlegame",
  judgement: null,
  accuracy: 90,
  pressure: false,
  ...overrides,
})
const game = (overrides: Partial<GameStats>): GameStats => ({
  gameId: "g",
  playedAt: new Date("2026-10-07T12:00:00").getTime(),
  speed: "blitz",
  color: "white",
  result: "win",
  opening: "Italian Game",
  accuracy: 85,
  moves: [],
  ...overrides,
})

describe("errorRates", () => {
  it("counts blunders and mistakes per 100 moves", () => {
    const moves = [move({ judgement: "blunder" }), move({ judgement: "mistake" }), move({}), move({ judgement: "inaccuracy" })]
    expect(errorRates(moves)).toMatchObject({ moves: 4, blunders: 1, mistakes: 1, blunderRate: 25, errorRate: 50 })
    expect(errorRates([])).toMatchObject({ moves: 0, blunderRate: 0 })
  })
})

describe("weeklyTrends", () => {
  it("buckets by Monday-starting week, keeping empty weeks as gaps", () => {
    const wed = new Date("2026-10-07T12:00:00").getTime() // a Wednesday
    const twoWeeksLater = new Date("2026-10-21T09:00:00").getTime()
    const games = [
      game({ playedAt: wed, accuracy: 80, moves: [move({ judgement: "blunder" }), move({}), move({}), move({})] }),
      game({ playedAt: twoWeeksLater, accuracy: 90, moves: [move({})] }),
    ]
    const reviews = [{ reviewedAt: wed, outcome: "clean" }, { reviewedAt: wed, outcome: "failed" }] as ReviewLog[]
    const weeks = weeklyTrends(games, reviews)

    expect(weeks.map((w) => new Date(w.week).getDay())).toEqual([1, 1, 1])
    expect(weeks[0]).toMatchObject({ games: 1, blunderRate: 25, accuracy: 80, puzzles: 2, puzzleClean: 0.5 })
    expect(weeks[1]).toMatchObject({ games: 0, blunderRate: null, accuracy: null, puzzleClean: null })
    expect(weeks[2]).toMatchObject({ games: 1, blunderRate: 0 })
    expect(weekStart(wed)).toBe(new Date("2026-10-05T00:00:00").getTime())
  })
})

describe("weakness breakdowns", () => {
  const games = [
    game({ opening: "Italian Game", result: "win", moves: [move({ phase: "opening" }), move({ judgement: "blunder", pressure: true })] }),
    game({ opening: "Italian Game", result: "draw", moves: [move({ phase: "endgame", judgement: "mistake", pressure: true })] }),
    game({ opening: "Sicilian Defense", color: "black", result: "loss", moves: [move({ pressure: null })] }),
  ]

  it("groups by opening and color, most played first, with score", () => {
    const rows = byOpening(games)
    expect(rows.map((r) => [r.opening, r.color, r.games, r.score])).toEqual([
      ["Italian Game", "white", 2, 0.75],
      ["Sicilian Defense", "black", 1, 0],
    ])
  })

  it("splits moves by phase and by time pressure", () => {
    const phases = byPhase(games)
    expect([phases.opening.moves, phases.middlegame.moves, phases.endgame.moves]).toEqual([1, 2, 1])
    const pressure = byPressure(games)
    expect(pressure.pressure).toMatchObject({ moves: 2, errorRate: 100 })
    // The game without clocks is left out of both sides
    expect(pressure.calm.moves).toBe(1)
  })
})
