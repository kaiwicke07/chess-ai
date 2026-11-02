import { describe, expect, it } from "vitest"

import { parseClock, parsePgnClocks } from "@/lib/chess/pgn"
import { formatTimeControl } from "@/lib/format"
import { normalizeChessComGame, openingNameFromUrl, parseTimeControl } from "@/lib/sources/chesscom"
import { normalizeLichessGame } from "@/lib/sources/lichess"
import chessComFixture from "./fixtures/chesscom-game.json"
import lichessFixture from "./fixtures/lichess-game.json"

// Real API records: penguingim1 (white) vs Heisenberg01, drawn, 73 plies with 74 clock entries
describe("normalizeLichessGame", () => {
  it("normalizes a game from the white player's side", () => {
    const game = normalizeLichessGame(lichessFixture, "penguingim1")!

    expect(game).toMatchObject({
      id: "lichess:rF6gn01H",
      account: "lichess:penguingim1",
      url: "https://lichess.org/rF6gn01H",
      playedAt: 1791402956799,
      speed: "blitz",
      timeControl: { initial: 180, increment: 0 },
      userColor: "white",
      result: "draw",
      termination: "draw",
      opening: { eco: "A42", name: "Modern Defense: Averbakh System" },
      white: { name: "penguingim1", rating: 2808 },
      black: { name: "Heisenberg01", rating: 2816 },
    })
    expect(game.moves).toHaveLength(73)
    expect(game.moves.slice(0, 3)).toEqual(["d4", "g6", "c4"])
  })

  it("drops the extra trailing clock entry and converts centiseconds to ms", () => {
    const game = normalizeLichessGame(lichessFixture, "penguingim1")!
    expect(game.clocks).toHaveLength(73)
    expect(game.clocks![0]).toBe(180_030)
  })

  it("matches the username case-insensitively and links the black side", () => {
    const game = normalizeLichessGame(lichessFixture, "HEISENBERG01")!
    expect(game.userColor).toBe("black")
    expect(game.account).toBe("lichess:heisenberg01")
    expect(game.url).toBe("https://lichess.org/rF6gn01H/black")
  })

  it("scores decisive games from the user's side", () => {
    const won = { ...lichessFixture, status: "mate", winner: "black" }
    expect(normalizeLichessGame(won, "heisenberg01")).toMatchObject({ result: "win", termination: "checkmate" })
    expect(normalizeLichessGame(won, "penguingim1")).toMatchObject({ result: "loss", termination: "checkmate" })
  })

  it("skips variants, untimed games and games the user didn't play", () => {
    expect(normalizeLichessGame({ ...lichessFixture, variant: "chess960" }, "penguingim1")).toBeNull()
    expect(normalizeLichessGame({ ...lichessFixture, clock: undefined }, "penguingim1")).toBeNull()
    expect(normalizeLichessGame(lichessFixture, "someone-else")).toBeNull()
    expect(normalizeLichessGame({ id: "malformed" }, "penguingim1")).toBeNull()
  })
})

// Real API record: Hikaru (white) beat JokerSicilian by resignation after 23 plies
describe("normalizeChessComGame", () => {
  it("normalizes a game from the winner's side", () => {
    const game = normalizeChessComGame(chessComFixture, "Hikaru")!

    expect(game).toMatchObject({
      id: "chesscom:c8cd46fc-ced8-11f1-98d3-5ede0001000f",
      account: "chesscom:hikaru",
      url: "https://www.chess.com/game/live/185803756742",
      playedAt: Date.UTC(2026, 9, 23, 11, 56, 30),
      speed: "blitz",
      timeControl: { initial: 180, increment: 0 },
      userColor: "white",
      result: "win",
      termination: "resignation",
      opening: { eco: "B06", name: "Modern Defense Standard Line" },
    })
    expect(game.moves).toHaveLength(23)
    expect(game.moves.at(-1)).toBe("Bxf7+")
  })

  it("reads one clock per ply from the PGN comments", () => {
    const game = normalizeChessComGame(chessComFixture, "hikaru")!
    expect(game.clocks).toHaveLength(23)
    expect(game.clocks!.slice(0, 3)).toEqual([180_000, 180_000, 179_100])
  })

  it("scores the loss from the other side", () => {
    expect(normalizeChessComGame(chessComFixture, "jokersicilian")).toMatchObject({
      userColor: "black",
      result: "loss",
      termination: "resignation",
    })
  })

  it("recognizes draws", () => {
    const drawn = {
      ...chessComFixture,
      white: { ...chessComFixture.white, result: "repetition" },
      black: { ...chessComFixture.black, result: "repetition" },
    }
    expect(normalizeChessComGame(drawn, "hikaru")).toMatchObject({ result: "draw", termination: "draw" })
  })

  it("skips variants and daily games", () => {
    expect(normalizeChessComGame({ ...chessComFixture, rules: "chess960" }, "hikaru")).toBeNull()
    expect(
      normalizeChessComGame({ ...chessComFixture, time_class: "daily", time_control: "1/86400" }, "hikaru"),
    ).toBeNull()
  })
})

describe("Chess.com helpers", () => {
  it("parses time controls", () => {
    expect(parseTimeControl("180+2")).toEqual({ initial: 180, increment: 2 })
    expect(parseTimeControl("60")).toEqual({ initial: 60, increment: 0 })
    expect(parseTimeControl("1/86400")).toBeNull()
  })

  it("turns opening URLs into names", () => {
    expect(openingNameFromUrl("https://www.chess.com/openings/Sicilian-Defense-Canal-Attack...10.h3-Bh5")).toBe(
      "Sicilian Defense Canal Attack",
    )
    expect(openingNameFromUrl("https://www.chess.com/openings/Italian-Game-Two-Knights-Defense-4.d3")).toBe(
      "Italian Game Two Knights Defense",
    )
    expect(openingNameFromUrl("https://www.chess.com/openings/Kings-Pawn-Opening")).toBe("Kings Pawn Opening")
    expect(openingNameFromUrl("not a url")).toBeNull()
  })
})

describe("clock parsing", () => {
  it("parses h:mm:ss and m:ss", () => {
    expect(parseClock("0:02:59.3")).toBe(179_300)
    expect(parseClock("2:59.3")).toBe(179_300)
    expect(parseClock("1:00:00")).toBe(3_600_000)
    expect(parseClock("abc")).toBeNull()
  })

  it("rejects clock lists that don't line up with the moves", () => {
    const pgn = "1. e4 {[%clk 0:03:00]} e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:02:58]}"
    expect(parsePgnClocks(pgn, 3)).toEqual([180_000, 180_000, 178_000])
    expect(parsePgnClocks(pgn, 4)).toBeNull()
  })
})

describe("formatTimeControl", () => {
  it("shows minutes, or seconds below a minute", () => {
    expect(formatTimeControl({ initial: 180, increment: 2 })).toBe("3+2")
    expect(formatTimeControl({ initial: 30, increment: 0 })).toBe("30s+0")
    expect(formatTimeControl({ initial: 90, increment: 1 })).toBe("1.5+1")
  })
})
