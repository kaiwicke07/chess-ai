import { Chess } from "chess.js"

import { Button } from "@/components/ui/button"
import { numberMoves } from "@/lib/chess/san"
import type { WeakSpot } from "@/lib/openings/deviations"
import { formatInterval } from "@/lib/srs/scheduler"
import type { ReviewCard } from "@/lib/types"

const START = new Chess().fen()

/** Ranked weak spots, each with its drill schedule and buttons to drill or explore it. */
export function WeakSpotList({
  spots,
  cards,
  now,
  currentId,
  onDrill,
  onExplore,
}: {
  spots: WeakSpot[]
  cards: Map<string, ReviewCard>
  now: number
  currentId: string | undefined
  onDrill: (id: string) => void
  onExplore: (key: string) => void
}) {
  return (
    <ol className="flex flex-col divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
      {spots.map((spot, index) => {
        const card = cards.get(spot.id)
        const schedule = !card ? "New" : card.due <= now ? "Due now" : `In ${formatInterval(card.due, now)}`
        const habit = spot.badMoves[0]
        const active = spot.id === currentId
        return (
          <li
            key={spot.id}
            aria-current={active ? "true" : undefined}
            className={`flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${active ? "bg-muted" : ""}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {/* The rank number fills ink on the drill in progress, so the row reads as current without a colored rule */}
              <span
                className={`flex h-5 min-w-6 shrink-0 items-center justify-center px-1 font-mono text-xs tabular-nums ${active ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono font-semibold">
                  {numberMoves(START, spot.pathSan).join(" ") || "Starting position"}
                </span>
                <span className="text-muted-foreground">
                  You play <span className="font-mono text-mistake">{habit.san}</span> (
                  <span className="font-mono tabular-nums">{habit.count}</span> of{" "}
                  <span className="font-mono tabular-nums">{spot.node.games}</span> games,{" "}
                  <span className="font-mono tabular-nums">−{Math.round(habit.loss)}%</span>). Better:{" "}
                  <span className="font-mono text-best">{spot.best.san}</span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
              <span
                className={`font-mono text-xs tabular-nums ${!card ? "text-primary" : card.due <= now ? "text-mistake" : "text-muted-foreground"}`}
              >
                {schedule}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onDrill(spot.id)}
              >
                Drill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => onExplore(spot.node.key)}
              >
                Explore
              </Button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
