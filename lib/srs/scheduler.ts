import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs"

/**
 * FSRS schedules each card from a model of how well it's remembered
 * (stability and difficulty), aiming for a 90% chance of still knowing it
 * when it comes due. One 10-minute learning step means a miss comes back
 * in the same session, while a correct first solve goes straight to days
 * (Good → 2 days, Easy → 8 days) instead of repeating a puzzle just solved.
 * Fuzz spreads due dates a little so cards learned together don't all come
 * due together.
 */
const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: true,
  learning_steps: ["10m"],
  relearning_steps: ["10m"],
})

/** The card after a review graded `grade` at `now`; a first review starts from a new card. */
export function scheduleNext(card: Card | undefined, grade: Grade, now: Date): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, grade).card
}

/** "10 minutes", "2 days", "3 weeks" until `due` */
export function formatInterval(due: number, now: number): string {
  const minutes = Math.max(1, Math.round((due - now) / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`
  const weeks = Math.round(days / 7)
  if (weeks < 9) return `${weeks} weeks`
  return `${Math.round(days / 30)} months`
}
