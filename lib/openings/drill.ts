import { winPercentFor } from "@/lib/analysis/winProbability"
import type { Eval } from "@/lib/types"
import { ACCEPTABLE_LOSS, type WeakSpot } from "./deviations"

export type MoveVerdict = "good" | "bad" | "unknown"

/**
 * Judges a drill move from what's already known: Stockfish's best and your
 * own good moves are fine, your recorded bad habits are not. Anything else
 * needs a fresh engine look (see verdictFromEval).
 */
export function knownVerdict(spot: WeakSpot, uci: string): MoveVerdict {
  if (spot.acceptable.includes(uci)) return "good"
  if (spot.badMoves.some((m) => m.uci === uci)) return "bad"
  return "unknown"
}

/** A move is fine if it keeps you within ACCEPTABLE_LOSS win-% points of best play. */
export function verdictFromEval(spot: WeakSpot, after: Eval): Exclude<MoveVerdict, "unknown"> {
  const loss = spot.win - winPercentFor(after, spot.color)
  return loss <= ACCEPTABLE_LOSS ? "good" : "bad"
}
