import { Rating, type Grade } from "ts-fsrs"

import type { SolveOutcome } from "@/lib/types"

/** A clean solve at or under this pace per user move counts as Easy. */
export const FAST_MS_PER_MOVE = 10_000

/**
 * Turns a puzzle attempt into an FSRS grade, so the user never has to rate
 * themselves:
 * - failed (showed the solution)           → Again: back in 10 minutes
 * - solved after a hint or a wrong move    → Hard
 * - solved cleanly                         → Good
 * - solved cleanly and fast                → Easy
 */
export function gradeFor(outcome: SolveOutcome, durationMs: number, userMoves: number): Grade {
  if (outcome === "failed") return Rating.Again
  if (outcome === "hinted" || outcome === "retried") return Rating.Hard
  return durationMs <= FAST_MS_PER_MOVE * Math.max(1, userMoves) ? Rating.Easy : Rating.Good
}

export const GRADE_LABELS: Record<Grade, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
}
