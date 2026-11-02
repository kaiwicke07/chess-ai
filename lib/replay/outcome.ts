import { Chess } from "chess.js"

import type { Color, Result } from "@/lib/types"

export interface ReplayOutcome {
  /** From the user's side */
  result: Result
  reason: "checkmate" | "stalemate" | "repetition" | "insufficient material" | "50-move rule" | "resignation"
}

/**
 * Whether a replay has ended. The moves are played out from the start
 * position so chess.js sees the whole history; threefold repetition can't be
 * judged from the current position alone.
 */
export function replayOutcome(startFen: string, uciMoves: string[], userColor: Color): ReplayOutcome | null {
  const chess = new Chess(startFen)
  for (const uci of uciMoves) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })

  if (chess.isCheckmate()) {
    // The side to move is the side that got mated
    const userMated = (chess.turn() === "w") === (userColor === "white")
    return { result: userMated ? "loss" : "win", reason: "checkmate" }
  }
  if (chess.isStalemate()) return { result: "draw", reason: "stalemate" }
  if (chess.isThreefoldRepetition()) return { result: "draw", reason: "repetition" }
  if (chess.isInsufficientMaterial()) return { result: "draw", reason: "insufficient material" }
  if (chess.isDrawByFiftyMoves()) return { result: "draw", reason: "50-move rule" }
  return null
}
