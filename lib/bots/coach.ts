import { Chess } from "chess.js"

import { moveAccuracy } from "@/lib/analysis/accuracy"
import { judge, type Judgement, type MoveAssessment } from "@/lib/analysis/classify"
import { winPercentFor } from "@/lib/analysis/winProbability"
import { uciLineToSan } from "@/lib/chess/san"
import { explainMove } from "@/lib/explain/templates"
import type { Color, PositionEval } from "@/lib/types"

/** Which moves make the coach stop the game. */
export type CoachLevel = "off" | "blunders" | "mistakes" | "all"

export const COACH_LEVELS: { id: CoachLevel; label: string; hint: string }[] = [
  { id: "mistakes", label: "Mistakes", hint: "Stops on mistakes and blunders" },
  { id: "blunders", label: "Blunders only", hint: "Stops only on big errors" },
  { id: "all", label: "Strict", hint: "Stops on inaccuracies too" },
  { id: "off", label: "Off", hint: "Just play" },
]

const STOPS_ON: Record<CoachLevel, Judgement[]> = {
  off: [],
  blunders: ["blunder"],
  mistakes: ["mistake", "blunder"],
  all: ["inaccuracy", "mistake", "blunder"],
}

export interface CoachVerdict {
  assessment: MoveAssessment
  /** The coach pauses the game on this move */
  stop: boolean
  /** Why it was bad, from the engine's lines (null for unflagged moves) */
  explanation: string | null
  /** The opponent's best answer to the move played, UCI and SAN */
  refutation: { uci: string; san: string } | null
  /** What Stockfish wanted instead, UCI and SAN */
  best: { uci: string; san: string } | null
  san: string
}

/**
 * The coach's read on one user move, judged by the same Lichess rules as a
 * game review, with the same engine-fact explanation. `before` and `after`
 * are the evals of the positions either side of the move.
 */
export function coachMove({
  fen,
  uci,
  before,
  after,
  color,
  ply,
  level,
}: {
  fen: string
  uci: string
  before: PositionEval
  after: PositionEval
  color: Color
  ply: number
  level: CoachLevel
}): CoachVerdict {
  const winBefore = winPercentFor(before.eval, color)
  const winAfter = winPercentFor(after.eval, color)
  const assessment: MoveAssessment = {
    ply,
    color,
    winBefore,
    winAfter,
    ...judge(before.eval, after.eval, color),
    best: before.best === uci,
    accuracy: moveAccuracy(winBefore, winAfter),
  }

  const chess = new Chess(fen)
  const san = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  const fenAfter = chess.fen()
  const refutation = after.best ? { uci: after.best, san: uciLineToSan(fenAfter, [after.best])[0] } : null
  const best = before.best ? { uci: before.best, san: uciLineToSan(fen, [before.best])[0] } : null

  return {
    assessment,
    stop: !!assessment.judgement && STOPS_ON[level].includes(assessment.judgement),
    explanation: explainMove({ fen, uci, assessment, before, after }),
    refutation,
    best,
    san,
  }
}
