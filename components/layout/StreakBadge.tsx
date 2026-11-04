"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { Flame } from "lucide-react"

import { db } from "@/lib/db/schema"
import { practiceStreak } from "@/lib/srs/streak"
import { useNow } from "@/lib/useNow"

/** Streak from the review log; shared by the header badge and the puzzles page. */
export function useStreak() {
  const now = useNow(60_000)
  const times = useLiveQuery(async () => (await db.reviews.orderBy("reviewedAt").keys()) as number[])
  if (!times || !now) return null
  return practiceStreak(times, now)
}

/**
 * The practice streak in the header. Lit once today's practice is done;
 * dimmed while it still needs today's practice to survive.
 */
export function StreakBadge() {
  const streak = useStreak()
  if (!streak?.days) return null

  const label = streak.today
    ? `${streak.days}-day practice streak`
    : `${streak.days}-day practice streak. Practice today to keep it going.`
  return (
    <span
      className={`hidden items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums sm:flex ${streak.today ? "bg-mistake/15 text-mistake" : "text-muted-foreground"}`}
      title={label}
      aria-label={label}
      role="img"
    >
      <Flame className="size-3.5" aria-hidden />
      {streak.days}
    </span>
  )
}
