import { Chess, type PieceSymbol } from "chess.js"

import { materialBalance } from "@/lib/chess/material"
import type { Color } from "@/lib/types"

export interface LineStep {
  san: string
  color: Color
  to: string
  /** Piece this move captured, if any */
  captured: PieceSymbol | null
  /** Position after this move */
  fen: string
}

export interface LineFacts {
  steps: LineStep[]
  /**
   * Net material change for `perspective` once the line settles, in pawns,
   * relative to the starting position. Positive means `perspective` won material.
   */
  materialChange: number
  /** The line is judged after this many moves (see lineFacts) */
  settledAt: number
}

/**
 * Plays an engine line out with chess.js and records what actually happens.
 * Material is counted at a quiet point, after a move not followed by a capture,
 * so a trade in progress (Bxc6 bxc6) isn't mistaken for winning a piece. The
 * last quiet point within `horizon` moves is used: far enough to see a fork or
 * pin cash in, close enough that unrelated later play doesn't count.
 */
export function lineFacts(fen: string, uciMoves: string[], perspective: Color, horizon = 6): LineFacts {
  const chess = new Chess(fen)
  const steps: LineStep[] = []
  for (const uci of uciMoves) {
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      steps.push({
        san: move.san,
        color: move.color === "w" ? "white" : "black",
        to: move.to,
        captured: move.captured ?? null,
        fen: move.after,
      })
    } catch {
      break
    }
  }

  let settledAt = 0
  for (let i = 1; i <= Math.min(horizon, steps.length); i++) {
    if (i === steps.length || !steps[i].captured) settledAt = i
  }

  const baseline = materialBalance(fen, perspective)
  const settledFen = settledAt ? steps[settledAt - 1].fen : fen
  return { steps, materialChange: materialBalance(settledFen, perspective) - baseline, settledAt }
}
