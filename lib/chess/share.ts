import { Chess } from "chess.js"

import type { Game } from "@/lib/types"

/** PGN's result tag, from White's side; Game.result is from the user's. */
export function pgnResult(game: Pick<Game, "result" | "userColor">): string {
  if (game.result === "draw") return "1/2-1/2"
  const whiteWon = (game.result === "win") === (game.userColor === "white")
  return whiteWon ? "1-0" : "0-1"
}

/** The whole game as a PGN with the usual tags, ready to paste into any chess site. */
export function gameToPgn(game: Game): string {
  const chess = new Chess()
  for (const san of game.moves) chess.move(san)
  const date = new Date(game.playedAt)
  const pad = (n: number) => String(n).padStart(2, "0")
  chess.setHeader("Event", `${game.rated ? "Rated" : "Casual"} ${game.speed} game`)
  chess.setHeader("Site", game.url)
  chess.setHeader("Date", `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`)
  chess.setHeader("White", game.white.name)
  chess.setHeader("Black", game.black.name)
  chess.setHeader("Result", pgnResult(game))
  if (game.white.rating) chess.setHeader("WhiteElo", String(game.white.rating))
  if (game.black.rating) chess.setHeader("BlackElo", String(game.black.rating))
  if (game.opening.eco) chess.setHeader("ECO", game.opening.eco)
  if (game.opening.name) chess.setHeader("Opening", game.opening.name)
  chess.setHeader("TimeControl", `${game.timeControl.initial}+${game.timeControl.increment}`)
  return chess.pgn()
}

/**
 * A link anyone can open: the position on Lichess's free analysis board.
 * Our own review links only work in the browser that holds the game.
 */
export function lichessAnalysisUrl(fen: string, orientation: "white" | "black" = "white"): string {
  return `https://lichess.org/analysis/${fen.replaceAll(" ", "_")}?color=${orientation}`
}
