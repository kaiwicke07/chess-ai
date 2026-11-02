"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { CircleCheck, CircleX, Cpu, Puzzle as PuzzleIcon } from "lucide-react"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { PuzzleSolver } from "@/components/puzzles/PuzzleSolver"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { db } from "@/lib/db/schema"
import { useAnalysisQueue } from "@/lib/engine/useAnalysisQueue"
import { formatRelative } from "@/lib/format"
import type { SolveOutcome } from "@/lib/puzzles/solve"
import { THEME_LABELS } from "@/lib/puzzles/themes"
import type { Game, Puzzle, PuzzleTheme } from "@/lib/types"

type Filter = PuzzleTheme | "all"

/** Puzzle id from a link like /puzzles#lichess:abc:12 (set by the review page). */
function idFromHash(): string | null {
  if (typeof window === "undefined") return null
  return decodeURIComponent(window.location.hash.slice(1)) || null
}

/**
 * Every puzzle generated from the user's games, newest game first, with a
 * solver for the current one. Results are kept for this visit only; Phase 6
 * stores them and schedules reviews.
 */
export function PuzzleTrainer() {
  const entries = useLiveQuery(async () => {
    const puzzles = await db.puzzles.toArray()
    const games = await db.games.bulkGet([...new Set(puzzles.map((p) => p.gameId))])
    const byId = new Map(games.filter((g): g is Game => !!g).map((g) => [g.id, g]))
    return puzzles
      .map((puzzle) => ({ puzzle, game: byId.get(puzzle.gameId) }))
      .sort((a, b) => (b.game?.playedAt ?? 0) - (a.game?.playedAt ?? 0) || a.puzzle.ply - b.puzzle.ply)
  })
  const queue = useAnalysisQueue()
  const [filter, setFilter] = useState<Filter>("all")
  const [currentId, setCurrentId] = useState<string | null>(idFromHash)
  const [results, setResults] = useState<Record<string, SolveOutcome>>({})

  if (entries === undefined) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden />

  if (!entries.length) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl p-6 ring-1 ring-foreground/10">
        <PuzzleIcon className="size-6 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">No puzzles yet</p>
          <p className="text-sm text-muted-foreground">
            Puzzles come from your own mistakes and blunders. Open an account and analyze its games; each game is
            checked for positions with one clearly best move.
          </p>
        </div>
        {queue.current && (
          <p className="flex items-center gap-2 text-sm" role="status">
            <Cpu className="size-4 animate-pulse text-primary" aria-hidden /> Analysis is running…
          </p>
        )}
        <RecentAccounts />
      </div>
    )
  }

  const counts = new Map<Filter, number>([["all", entries.length]])
  for (const { puzzle } of entries) for (const t of puzzle.themes) counts.set(t, (counts.get(t) ?? 0) + 1)
  const visible = filter === "all" ? entries : entries.filter((e) => e.puzzle.themes.includes(filter))

  // Current puzzle: the one picked, else the first not tried yet this visit
  const current =
    entries.find((e) => e.puzzle.id === currentId) ?? visible.find((e) => !results[e.puzzle.id]) ?? visible[0]
  const next = visible.find((e) => e.puzzle.id !== current?.puzzle.id && !results[e.puzzle.id])

  const select = (id: string) => {
    setCurrentId(id)
    // Keep the address shareable within this browser without a navigation
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`)
  }

  const attempted = Object.keys(results).length
  const solved = Object.values(results).filter((r) => r !== "failed").length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Puzzles</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} from your own games
            {attempted > 0 && (
              <>
                {" "}
                · {solved} of {attempted} solved this session
              </>
            )}
          </p>
        </div>
        {queue.current && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Cpu className="size-4 animate-pulse text-primary" aria-hidden /> Finding more in the background
          </p>
        )}
      </header>

      {current && (
        <PuzzleSolver
          key={current.puzzle.id}
          puzzle={current.puzzle}
          game={current.game}
          onFinished={(outcome) => setResults((r) => (r[current.puzzle.id] ? r : { ...r, [current.puzzle.id]: outcome }))}
          onNext={next ? () => select(next.puzzle.id) : null}
        />
      )}

      <section aria-labelledby="all-puzzles" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="all-puzzles" className="text-lg font-semibold">
            All puzzles
          </h2>
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => value[0] && setFilter(value[0] as Filter)}
            variant="outline"
            size="sm"
            className="flex-wrap"
            aria-label="Filter by theme"
          >
            {(["all", "mate", "fork", "hangingPiece", "material", "advantage", "defense"] as Filter[])
              .filter((f) => counts.get(f))
              .map((f) => (
                <ToggleGroupItem key={f} value={f} className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
                  {f === "all" ? "All" : THEME_LABELS[f]} <span className="text-muted-foreground">{counts.get(f)}</span>
                </ToggleGroupItem>
              ))}
          </ToggleGroup>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ puzzle, game }) => (
            <li key={puzzle.id}>
              <PuzzleItem
                puzzle={puzzle}
                game={game}
                result={results[puzzle.id]}
                active={puzzle.id === current?.puzzle.id}
                onSelect={() => select(puzzle.id)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PuzzleItem({
  puzzle,
  game,
  result,
  active,
  onSelect,
}: {
  puzzle: Puzzle
  game: Game | undefined
  result: SolveOutcome | undefined
  active: boolean
  onSelect: () => void
}) {
  const opponent = game && (game.userColor === "white" ? game.black : game.white)
  const themes = puzzle.themes
    .map((t) => (t === "mate" && puzzle.mateIn ? `Mate in ${puzzle.mateIn}` : THEME_LABELS[t]))
    .join(" · ")

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ring-1 transition-colors ${active ? "bg-primary/15 ring-primary/50" : "ring-foreground/10 hover:bg-muted/50"}`}
    >
      <span
        className={`size-3 shrink-0 rounded-sm ${puzzle.color === "white" ? "bg-white" : "bg-neutral-950 ring-1 ring-neutral-300"}`}
        aria-label={`Play as ${puzzle.color}`}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{themes}</span>
        <span className="truncate text-xs text-muted-foreground">
          {opponent ? `vs ${opponent.name}` : "Game"}
          {game && ` · ${formatRelative(game.playedAt)}`}
        </span>
      </span>
      {result === "failed" ? (
        <CircleX className="size-4 shrink-0 text-blunder" aria-label="Missed" />
      ) : result ? (
        <CircleCheck className="size-4 shrink-0 text-best" aria-label="Solved" />
      ) : null}
    </button>
  )
}
