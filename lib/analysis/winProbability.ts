import type { Color, Eval } from "@/lib/types"

/** Lichess caps centipawn scores here, and scores forced mates as this. */
const CEILING = 1000

/**
 * Lichess's winning chances, −1..1, for a centipawn score. No ceiling here:
 * move judgements use raw scores, so −7 → −19 still counts as an inaccuracy,
 * while win % (and therefore accuracy) caps at ±1000 first.
 */
export function winningChances(cp: number): number {
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1
}

/**
 * White's chance of winning, 0–100, using Lichess's formula
 * (scalachess WinPercent, lichess.org/page/accuracy). It is S-shaped: a pawn
 * matters a lot near 0.0 and very little at +8, which is why mistakes are
 * judged by win-% drops. Like Lichess, mates count as ±1000 cp (about 97.5%),
 * so finding a faster or slower mate never registers as a big swing.
 */
export function winPercent(evaluation: Eval): number {
  const cp =
    evaluation.kind === "cp"
      ? Math.max(-CEILING, Math.min(CEILING, evaluation.cp))
      : (evaluation.kind === "mate" ? evaluation.moves > 0 : evaluation.winner === "white")
        ? CEILING
        : -CEILING
  return 50 + 50 * winningChances(cp)
}

/** `color`'s chance of winning, 0–100. The curve is symmetric, so black's is 100 − white's. */
export function winPercentFor(evaluation: Eval, color: Color): number {
  const white = winPercent(evaluation)
  return color === "white" ? white : 100 - white
}

/** The same eval seen from `color`'s side (evals are stored from white's). */
export function evalFor(evaluation: Eval, color: Color): Eval {
  if (color === "white" || evaluation.kind === "checkmate") return evaluation
  return evaluation.kind === "cp" ? { kind: "cp", cp: -evaluation.cp } : { kind: "mate", moves: -evaluation.moves }
}

/** "+1.35", "-0.50", "M3", "-M2", or "#" for a finished checkmate */
export function formatEval(evaluation: Eval): string {
  switch (evaluation.kind) {
    case "checkmate":
      return "#"
    case "mate":
      return evaluation.moves > 0 ? `M${evaluation.moves}` : `-M${-evaluation.moves}`
    case "cp": {
      const pawns = evaluation.cp / 100
      return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`
    }
  }
}
