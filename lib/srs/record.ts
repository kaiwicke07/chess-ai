import { db } from "@/lib/db/schema"
import type { Puzzle, ReviewCard, SolveOutcome } from "@/lib/types"
import { gradeFor } from "./grading"
import { scheduleNext } from "./scheduler"

export const cardId = (kind: ReviewCard["kind"], refId: string) => `${kind}:${refId}`
export const puzzleCardId = (puzzleId: string) => cardId("puzzle", puzzleId)

/**
 * Saves an attempt at any practice item: grades it, reschedules its card
 * (creating it on the first attempt), and appends to the review log, all in
 * one transaction so the card and the log can't disagree. Every attempt
 * counts, including practice before the card is due; FSRS accounts for the
 * short gap, so an early review grows the interval only a little.
 */
export async function recordReview(
  item: { kind: ReviewCard["kind"]; refId: string; account: string },
  outcome: SolveOutcome,
  durationMs: number,
  userMoves: number,
): Promise<{ card: ReviewCard; grade: number }> {
  const id = cardId(item.kind, item.refId)
  const now = new Date()
  const grade = gradeFor(outcome, durationMs, userMoves)

  return db.transaction("rw", db.cards, db.reviews, async () => {
    const existing = await db.cards.get(id)
    const fsrs = scheduleNext(existing?.fsrs, grade, now)
    const card: ReviewCard = {
      id,
      kind: item.kind,
      refId: item.refId,
      account: item.account,
      fsrs,
      due: fsrs.due.getTime(),
      createdAt: existing?.createdAt ?? now.getTime(),
    }
    await db.cards.put(card)
    await db.reviews.add({
      cardId: id,
      kind: item.kind,
      refId: item.refId,
      account: item.account,
      outcome,
      grade,
      durationMs,
      reviewedAt: now.getTime(),
      nextDue: card.due,
    })
    return { card, grade }
  })
}

/** A puzzle attempt; the user's move count sets the pace for an Easy grade. */
export function recordAttempt(puzzle: Puzzle, outcome: SolveOutcome, durationMs: number) {
  return recordReview(
    { kind: "puzzle", refId: puzzle.id, account: puzzle.account },
    outcome,
    durationMs,
    Math.ceil(puzzle.solution.length / 2),
  )
}
