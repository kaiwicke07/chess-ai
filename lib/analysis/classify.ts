import type { Position } from "@/lib/chess/positions"
import type { Color, Eval, PositionEval } from "@/lib/types"
import { moveAccuracy } from "./accuracy"
import { winningChances, winPercentFor } from "./winProbability"

export type Judgement = "inaccuracy" | "mistake" | "blunder"

/** How a forced mate changed with this move (Lichess's MateCreated / MateLost) */
export type MateChange = "allowed" | "lost"

export interface MoveAssessment {
  /** Index into positions of the position this move leads to (1 = white's first move) */
  ply: number
  color: Color
  /** The mover's win chance, 0–100, before and after the move */
  winBefore: number
  winAfter: number
  judgement: Judgement | null
  mate: MateChange | null
  /** The move played was Stockfish's top choice */
  best: boolean
  /** 0–100, see accuracy.ts */
  accuracy: number
}

export const JUDGEMENT_GLYPHS: Record<Judgement, string> = { inaccuracy: "?!", mistake: "?", blunder: "??" }
export const JUDGEMENT_LABELS: Record<Judgement, string> = {
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
}

// Lichess compares winning chances on a −1..1 scale with thresholds .3/.2/.1;
// on our 0–100 win % scale that is a drop of 15, 10 and 5 points.
const WIN_DROP_THRESHOLDS: [number, Judgement][] = [
  [15, "blunder"],
  [10, "mistake"],
  [5, "inaccuracy"],
]

/** An eval from the mover's side: positive cp or mate is good for the mover. */
type MoverScore = { kind: "cp"; cp: number } | { kind: "mate"; moves: number }

function moverScore(evaluation: Eval, mover: Color): MoverScore {
  const sign = mover === "white" ? 1 : -1
  if (evaluation.kind === "cp") return { kind: "cp", cp: sign * evaluation.cp }
  if (evaluation.kind === "mate") return { kind: "mate", moves: sign * evaluation.moves }
  // A checkmate on the board counts as a mate for whoever delivered it
  return { kind: "mate", moves: evaluation.winner === mover ? 1 : -1 }
}

/**
 * Lichess's rules (lila Advice.scala). Plain evals are judged by the drop in
 * the mover's win chance. When a forced mate appears or disappears, severity
 * depends on how decided the game already was: allowing mate when already
 * 10 pawns down is only an inaccuracy. Never flagged: finding a slower mate,
 * or escaping a mate.
 */
export function judge(before: Eval, after: Eval, mover: Color): { judgement: Judgement | null; mate: MateChange | null } {
  const prev = moverScore(before, mover)
  const next = moverScore(after, mover)

  if (prev.kind === "cp" && next.kind === "cp") {
    // Uncapped, unlike winPercent: Lichess judges on raw scores (see winningChances)
    const drop = 50 * (winningChances(prev.cp) - winningChances(next.cp))
    return { judgement: WIN_DROP_THRESHOLDS.find(([threshold]) => drop >= threshold)?.[1] ?? null, mate: null }
  }

  if (prev.kind === "cp" && next.kind === "mate" && next.moves < 0) {
    const judgement: Judgement = prev.cp < -999 ? "inaccuracy" : prev.cp < -700 ? "mistake" : "blunder"
    return { judgement, mate: "allowed" }
  }
  if (prev.kind === "mate" && prev.moves > 0 && (next.kind === "cp" || next.moves < 0)) {
    const nextCp = next.kind === "cp" ? next.cp : 0
    const judgement: Judgement = nextCp > 999 ? "inaccuracy" : nextCp > 700 ? "mistake" : "blunder"
    return { judgement, mate: "lost" }
  }
  return { judgement: null, mate: null }
}

/**
 * Assesses every move of a game. The result is aligned with `positions`:
 * entry i describes the move that led to positions[i], so entry 0 is always
 * null, as is any move whose before or after position isn't analyzed yet.
 */
export function assessMoves(
  positions: Position[],
  evals: (PositionEval | undefined)[],
): (MoveAssessment | null)[] {
  return positions.map((position, ply) => {
    const move = position.lastMove
    const before = evals[ply - 1]
    const after = evals[ply]
    if (!move || !before || !after) return null

    const winBefore = winPercentFor(before.eval, move.color)
    const winAfter = winPercentFor(after.eval, move.color)
    return {
      ply,
      color: move.color,
      winBefore,
      winAfter,
      ...judge(before.eval, after.eval, move.color),
      best: before.best === move.uci,
      accuracy: moveAccuracy(winBefore, winAfter),
    }
  })
}
