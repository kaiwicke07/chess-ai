"use client"

import { Cpu, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { analysisQueue, type QueueSnapshot } from "@/lib/engine/queue"

/**
 * Starts background analysis of an account's unanalyzed games and shows how
 * far it has got. Analysis keeps running while you browse other pages.
 */
export function AnalysisProgress({
  gameIds,
  unanalyzedIds,
  queue,
}: {
  gameIds: string[]
  unanalyzedIds: string[]
  queue: QueueSnapshot
}) {
  const ours = new Set(gameIds)
  const active = queue.current && ours.has(queue.current.gameId) ? queue.current : null
  const waiting = queue.pending.filter((id) => ours.has(id)).length

  if (active || waiting) {
    // total is 0 for the moment between picking a game and loading it.
    // Evals are roughly the first 70% of a game's work, the puzzle scan the rest.
    const phaseFraction = active && active.total ? active.done / active.total : 0
    const fraction = active?.phase === "puzzles" ? 0.7 + 0.3 * phaseFraction : 0.7 * phaseFraction
    const analyzed = gameIds.length - unanalyzedIds.length
    return (
      <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
        <Cpu className="size-4 shrink-0 animate-pulse text-primary" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span role="status">
            Analyzing with Stockfish ·{" "}
            <span className="font-mono tabular-nums">{analyzed}</span> of{" "}
            <span className="font-mono tabular-nums">{gameIds.length}</span> done
            {active && (
              <span className="text-muted-foreground">
                {" "}
                · current game:{" "}
                {active.phase === "puzzles"
                  ? `checking mistakes for puzzles ${active.done}/${active.total}`
                  : `${Math.round(phaseFraction * 100)}%`}
              </span>
            )}
          </span>
          <div className="h-1.5 overflow-hidden bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${((analyzed + fraction) / gameIds.length) * 100}%` }}
            />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => analysisQueue?.clear()}>
          <Square aria-hidden /> Stop
        </Button>
      </div>
    )
  }

  if (!unanalyzedIds.length) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        {queue.error ? (
          <span className="text-destructive">{queue.error}</span>
        ) : (
          <>
            {unanalyzedIds.length} {unanalyzedIds.length === 1 ? "game hasn't" : "games haven't"} been analyzed yet.
            Stockfish runs in your browser and turns your mistakes into puzzles, usually 20–45 seconds per game.
          </>
        )}
      </span>
      <Button onClick={() => analysisQueue?.enqueue(unanalyzedIds)}>
        <Cpu aria-hidden /> Analyze {unanalyzedIds.length} {unanalyzedIds.length === 1 ? "game" : "games"}
      </Button>
    </div>
  )
}
