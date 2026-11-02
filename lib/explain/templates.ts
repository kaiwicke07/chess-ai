import type { MoveAssessment } from "@/lib/analysis/classify"
import { evalFor, formatEval } from "@/lib/analysis/winProbability"
import { describeMaterial, PIECE_NAMES, PIECE_VALUES } from "@/lib/chess/material"
import { numberMoves } from "@/lib/chess/san"
import type { PositionEval } from "@/lib/types"
import { lineFacts, type LineStep } from "./facts"

export interface MoveContext {
  /** Position before the move */
  fen: string
  /** The move played, UCI */
  uci: string
  assessment: MoveAssessment
  /** Engine verdicts on the positions before and after the move */
  before: PositionEval
  after: PositionEval
}

const COLOR_NAMES = { white: "White", black: "Black" } as const

const sanLine = (fen: string, steps: LineStep[]) =>
  numberMoves(
    fen,
    steps.map((step) => step.san),
  ).join(" ")

/**
 * One sentence on why a flagged move was bad, built only from what the
 * engine's lines show when replayed. Checks run in priority order; the first
 * that applies wins. Returns null for moves that weren't flagged.
 *
 * 1. Allowed a forced mate        "This allows mate in 2: 1… Qh2+ 2. Kf1 Qh1#."
 * 2. Missed a forced mate         "This misses mate in 1: 1. Re8#."
 * 3. Gave up material             "This hangs the knight on e6 to fxe6."
 * 4. Missed winning material      "Bxc6+ would have won a piece."
 * 5. Otherwise, the evals only    "Stockfish prefers Nf3. White's evaluation drops from +0.30 to -1.20."
 */
export function explainMove({ fen, uci, assessment, before, after }: MoveContext): string | null {
  if (!assessment.judgement) return null
  const mover = assessment.color

  // The move played followed by the opponent's best reply line, and the line
  // Stockfish wanted instead, both counted from before the move
  const played = lineFacts(fen, [uci, ...after.pv], mover)
  const best = lineFacts(fen, before.pv, mover)
  const fenAfter = played.steps[0]?.fen
  const bestMove = best.steps[0]?.san
  if (!fenAfter) return null

  if (assessment.mate === "allowed" && after.eval.kind === "mate") {
    const n = Math.abs(after.eval.moves)
    return `This allows mate in ${n}: ${sanLine(fenAfter, played.steps.slice(1, 2 * n))}.`
  }

  if (assessment.mate === "lost" && before.eval.kind === "mate") {
    const n = Math.abs(before.eval.moves)
    return `This misses mate in ${n}: ${sanLine(fen, best.steps.slice(0, 2 * n - 1))}.`
  }

  const loss = Math.round(-played.materialChange)
  const gain = Math.round(best.materialChange)

  // Lost material that the best line would have kept
  if (loss >= 1 && played.materialChange < best.materialChange - 0.5) {
    const reply = played.steps[1]
    // Only "hangs" when that capture is the whole loss; otherwise show the trade
    if (reply?.captured && PIECE_VALUES[reply.captured] === loss) {
      return `This hangs the ${PIECE_NAMES[reply.captured]} on ${reply.to} to ${reply.san}.`
    }
    return `This loses ${describeMaterial(loss)}: ${sanLine(fenAfter, played.steps.slice(1, played.settledAt))}.`
  }

  if (gain >= 1 && best.materialChange > played.materialChange + 0.5 && bestMove) {
    // A capture that is the whole gain reads best on its own; a trade or
    // anything slower (a fork, a pin) needs the line to make sense
    const first = best.steps[0]
    return first.captured && PIECE_VALUES[first.captured] === gain
      ? `${bestMove} would have won ${describeMaterial(gain)}.`
      : `${bestMove} would have won ${describeMaterial(gain)}: ${sanLine(fen, best.steps.slice(0, best.settledAt))}.`
  }

  const drop = `${COLOR_NAMES[mover]}'s evaluation drops from ${formatEval(evalFor(before.eval, mover))} to ${formatEval(evalFor(after.eval, mover))}.`
  // Rarely the engine's first choice still loses ground once it looks deeper
  return bestMove && before.best !== uci ? `Stockfish prefers ${bestMove}. ${drop}` : drop
}
