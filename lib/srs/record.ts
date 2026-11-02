import { db } from "@/lib/db/schema"
import type { Puzzle, ReviewCard, SolveOutcome } from "@/lib/types"
import { gradeFor } from "./grading"
import { scheduleNext } from "./scheduler"

export const puzzleCardId = (puzzleId: string) => `puzzle:${puzzleId}`

/**
 * Saves a puzzle attempt: grades it, reschedules the puzzle's card (creating
 * it on the first attempt), and appends to the review log, all in one
 * transaction so the card and the log can't disagree. Every attempt counts,
 * including practicing a puzzle before it's due; FSRS accounts for the short
 * gap, so an early review grows the interval only a little.
 */
export async function recordAttempt(
  puzzle: Puzzle,
  outcome: SolveOutcome,
  durationMs: number,
): Promise<{ card: ReviewCard; grade: number }> {
  const id = puzzleCardId(puzzle.id)
  const now = new Date()
  const grade = gradeFor(outcome, durationMs, Math.ceil(puzzle.solution.length / 2))

  return db.transaction("rw", db.cards, db.reviews, async () => {
    const existing = await db.cards.get(id)
    const fsrs = scheduleNext(existing?.fsrs, grade, now)
    const card: ReviewCard = {
      id,
      kind: "puzzle",
      refId: puzzle.id,
      account: puzzle.account,
      fsrs,
      due: fsrs.due.getTime(),
      createdAt: existing?.createdAt ?? now.getTime(),
    }
    await db.cards.put(card)
    await db.reviews.add({
      cardId: id,
      kind: "puzzle",
      refId: puzzle.id,
      account: puzzle.account,
      outcome,
      grade,
      durationMs,
      reviewedAt: now.getTime(),
      nextDue: card.due,
    })
    return { card, grade }
  })
}
