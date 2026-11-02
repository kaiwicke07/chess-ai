import type { Eval } from "@/lib/types"

/**
 * White's chance of winning, 0–100, using Lichess's published formula
 * (lichess.org/page/accuracy). It is S-shaped: a pawn matters a lot near 0.0
 * and very little at +8, which is why mistakes are judged by win-% drops.
 */
export function winPercent(evaluation: Eval): number {
  switch (evaluation.kind) {
    case "checkmate":
      return evaluation.winner === "white" ? 100 : 0
    case "mate":
      return evaluation.moves > 0 ? 100 : 0
    case "cp": {
      const cp = Math.max(-1000, Math.min(1000, evaluation.cp))
      return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
    }
  }
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
