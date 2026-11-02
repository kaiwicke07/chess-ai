import type { ReviewCard } from "@/lib/types"

/** New puzzles introduced per day, so a big import doesn't bury the reviews. */
export const NEW_PER_DAY = 10

export interface DailyQueue<T> {
  /** Seen before and due now, most overdue first */
  due: T[]
  /** Never attempted, up to what's left of today's new allowance */
  fresh: T[]
  /** When the next card comes due, if nothing is due now */
  nextDue: number | null
}

export function startOfDay(now: number): number {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/**
 * Today's practice for one kind of item (puzzles or opening drills): due
 * reviews first, then new items in `items`' order (the caller sorts them).
 * `cards` is keyed by item id; cards whose item no longer exists (a puzzle
 * regenerated away) are ignored. Each kind has its own new-item allowance.
 */
export function dailyQueue<T extends { id: string }>(
  items: T[],
  cards: Map<string, ReviewCard>,
  now: number,
  newPerDay = NEW_PER_DAY,
): DailyQueue<T> {
  const dayStart = startOfDay(now)
  const withCards = items.flatMap((item) => {
    const card = cards.get(item.id)
    return card ? [{ item, card }] : []
  })

  const due = withCards
    .filter(({ card }) => card.due <= now)
    .sort((a, b) => a.card.due - b.card.due)
    .map(({ item }) => item)

  const introducedToday = withCards.filter(({ card }) => card.createdAt >= dayStart).length
  const allowance = Math.max(0, newPerDay - introducedToday)
  const fresh = items.filter((item) => !cards.has(item.id)).slice(0, allowance)

  const upcoming = withCards.map(({ card }) => card.due).filter((d) => d > now)
  return { due, fresh, nextDue: upcoming.length ? Math.min(...upcoming) : null }
}
