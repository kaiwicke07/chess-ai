import { startOfDay } from "@/lib/srs/dailyQueue"

export interface Streak {
  /** Consecutive days with at least one puzzle or drill attempt */
  days: number
  /** Whether today already counts; if not, the streak is still alive until midnight */
  today: boolean
}

/** The local midnight before `dayStart`, stepped by calendar date so DST days still work. */
function previousDay(dayStart: number): number {
  const day = new Date(dayStart)
  day.setDate(day.getDate() - 1)
  return day.getTime()
}

/**
 * The practice streak from the review log's timestamps. A day counts if it
 * has any attempt. A streak that ended yesterday is still shown (with
 * `today: false`), since practicing before midnight keeps it going.
 */
export function practiceStreak(reviewedAt: Iterable<number>, now: number): Streak {
  const days = new Set<number>()
  for (const at of reviewedAt) days.add(startOfDay(at))

  const today = startOfDay(now)
  const practicedToday = days.has(today)
  let day = practicedToday ? today : previousDay(today)
  let count = 0
  while (days.has(day)) {
    count++
    day = previousDay(day)
  }
  return { days: count, today: practicedToday }
}
