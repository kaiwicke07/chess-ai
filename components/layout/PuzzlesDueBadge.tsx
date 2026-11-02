"use client"

import { useLiveQuery } from "dexie-react-hooks"

import { db } from "@/lib/db/schema"
import { dailyQueue } from "@/lib/srs/dailyQueue"
import { useNow } from "@/lib/useNow"

/** Count of puzzles waiting today (due reviews plus today's new ones), for the header. */
export function PuzzlesDueBadge() {
  const now = useNow(60_000)
  const data = useLiveQuery(async () => {
    const [puzzles, cards] = await Promise.all([db.puzzles.toArray(), db.cards.where("kind").equals("puzzle").toArray()])
    return { puzzles, cards: new Map(cards.map((c) => [c.refId, c])) }
  })
  if (!data || !now) return null

  const queue = dailyQueue(data.puzzles, data.cards, now)
  const count = queue.due.length + queue.fresh.length
  if (!count) return null

  return (
    <span
      className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
      aria-label={`${count} waiting today`}
    >
      {count}
    </span>
  )
}
