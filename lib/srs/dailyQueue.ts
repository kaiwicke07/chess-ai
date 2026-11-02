import type { Puzzle, ReviewCard } from "@/lib/types"

/** New puzzles introduced per day, so a big import doesn't bury the reviews. */
export const NEW_PER_DAY = 10

export interface DailyQueue {
  /** Seen before and due now, most overdue first */
  due: Puzzle[]
  /** Never attempted, up to what's left of today's new-puzzle allowance */
  fresh: Puzzle[]
  /** When the next card comes due, if nothing is due now */
  nextDue: number | null
}

export function startOfDay(now: number): number {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/**
 * Today's practice: due reviews first, then new puzzles in `puzzles`' order
 * (the caller sorts them, newest game first). Cards whose puzzle no longer
 * exists (after a regeneration) are ignored.
 */
export function dailyQueue(puzzles: Puzzle[], cards: Map<string, ReviewCard>, now: number): DailyQueue {
  const dayStart = startOfDay(now)
  const withCards = puzzles.flatMap((puzzle) => {
    const card = cards.get(puzzle.id)
    return card ? [{ puzzle, card }] : []
  })

  const due = withCards
    .filter(({ card }) => card.due <= now)
    .sort((a, b) => a.card.due - b.card.due)
    .map(({ puzzle }) => puzzle)

  const introducedToday = withCards.filter(({ card }) => card.createdAt >= dayStart).length
  const allowance = Math.max(0, NEW_PER_DAY - introducedToday)
  const fresh = puzzles.filter((puzzle) => !cards.has(puzzle.id)).slice(0, allowance)

  const upcoming = withCards.map(({ card }) => card.due).filter((d) => d > now)
  return { due, fresh, nextDue: upcoming.length ? Math.min(...upcoming) : null }
}
