import { Chess } from "chess.js"

import type { Color, Game } from "@/lib/types"

export interface Position {
  fen: string
  /** The move that produced this position; null for the starting position */
  lastMove: { san: string; uci: string; from: string; to: string; color: Color } | null
}

/**
 * Replays SAN moves from the start. `positions[i]` is the position after i
 * plies, so `positions[0]` is the start and there are moves.length + 1 entries.
 * Stops early at an illegal move rather than throwing.
 */
export function replayMoves(moves: string[]): Position[] {
  const chess = new Chess()
  const positions: Position[] = [{ fen: chess.fen(), lastMove: null }]

  for (const san of moves) {
    let move
    try {
      move = chess.move(san)
    } catch {
      break
    }
    positions.push({
      fen: move.after,
      lastMove: {
        san: move.san,
        // chess.js's long algebraic matches the engine's UCI format: e2e4, e7e8q
        uci: move.lan,
        from: move.from,
        to: move.to,
        color: move.color === "w" ? "white" : "black",
      },
    })
  }
  return positions
}

/**
 * Like replayMoves, but from any position and with UCI moves (as the engine
 * and the interactive board produce them). Used for replays against Stockfish.
 */
export function replayUci(fen: string, uciMoves: string[]): Position[] {
  const chess = new Chess(fen)
  const positions: Position[] = [{ fen: chess.fen(), lastMove: null }]
  for (const uci of uciMoves) {
    let move
    try {
      move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    } catch {
      break
    }
    positions.push({
      fen: move.after,
      lastMove: { san: move.san, uci: move.lan, from: move.from, to: move.to, color: move.color === "w" ? "white" : "black" },
    })
  }
  return positions
}

/**
 * Each side's remaining time (ms) in the position after `ply` plies.
 * A side that hasn't moved yet shows the starting time. Null without clock data.
 */
export function clocksAt(
  game: Pick<Game, "clocks" | "timeControl">,
  ply: number,
): { white: number; black: number } | null {
  if (!game.clocks) return null
  const initial = game.timeControl.initial * 1000

  // Ply index i (0-based) was played by white when i is even
  const lastIndex = (parity: 0 | 1) => {
    const i = ply - 1
    return i % 2 === parity ? i : i - 1
  }
  const read = (index: number) => (index >= 0 ? game.clocks![index] : initial)

  return { white: read(lastIndex(0)), black: read(lastIndex(1)) }
}
