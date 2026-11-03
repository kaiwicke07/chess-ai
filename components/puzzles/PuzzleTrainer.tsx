"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { CalendarCheck, CircleCheck, CircleX, Cpu, Puzzle as PuzzleIcon } from "lucide-react"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { PuzzleSolver } from "@/components/puzzles/PuzzleSolver"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { db } from "@/lib/db/schema"
import { useAnalysisQueue } from "@/lib/engine/useAnalysisQueue"
import { formatRelative } from "@/lib/format"
import { THEME_LABELS } from "@/lib/puzzles/themes"
import { dailyQueue, NEW_PER_DAY, startOfDay } from "@/lib/srs/dailyQueue"
import { recordAttempt } from "@/lib/srs/record"
import { formatInterval } from "@/lib/srs/scheduler"
import type { Game, Puzzle, PuzzleTheme, ReviewCard, SolveOutcome } from "@/lib/types"
import { useNow } from "@/lib/useNow"

type Mode = "today" | "all"
type Filter = PuzzleTheme | "all"
type Entry = { puzzle: Puzzle; game: Game | undefined }
type Saved = { due: number; grade: number; savedAt: number }

/** Puzzle id from a link like /puzzles#lichess:abc:12 (set by the review page). */
function idFromHash(): string | null {
  if (typeof window === "undefined") return null
  return decodeURIComponent(window.location.hash.slice(1)) || null
}

/**
 * The puzzle trainer. "Today" works through due reviews, then a few new
 * puzzles; "All puzzles" is free practice with theme filters. Every attempt,
 * in either mode, is graded and rescheduled (lib/srs).
 */
export function PuzzleTrainer() {
  const data = useLiveQuery(async () => {
    const puzzles = await db.puzzles.toArray()
    const games = await db.games.bulkGet([...new Set(puzzles.map((p) => p.gameId))])
    const byId = new Map(games.filter((g): g is Game => !!g).map((g) => [g.id, g]))
    const entries: Entry[] = puzzles
      .map((puzzle) => ({ puzzle, game: byId.get(puzzle.gameId) }))
      .sort((a, b) => (b.game?.playedAt ?? 0) - (a.game?.playedAt ?? 0) || a.puzzle.ply - b.puzzle.ply)
    const cards = await db.cards.where("kind").equals("puzzle").toArray()
    const reviewedToday = await db.reviews.where("reviewedAt").aboveOrEqual(startOfDay(Date.now())).count()
    return { entries, cards: new Map(cards.map((c) => [c.refId, c])), reviewedToday }
  })
  const now = useNow(30_000)
  const queueState = useAnalysisQueue()
  const [mode, setMode] = useState<Mode>(() => (idFromHash() ? "all" : "today"))
  const [filter, setFilter] = useState<Filter>("all")
  const [currentId, setCurrentId] = useState<string | null>(idFromHash)
  const [outcomes, setOutcomes] = useState<Record<string, SolveOutcome>>({})
  const [saved, setSaved] = useState<Record<string, Saved>>({})

  if (data === undefined || now === 0) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden />
  const { entries, cards, reviewedToday } = data

  if (!entries.length) return <NoPuzzles analyzing={!!queueState.current} />

  const byId = new Map(entries.map((e) => [e.puzzle.id, e]))
  const queue = dailyQueue(
    entries.map((e) => e.puzzle),
    cards,
    now,
  )
  const queueIds = [...queue.due, ...queue.fresh].map((p) => p.id)
  const visible = filter === "all" ? entries : entries.filter((e) => e.puzzle.themes.includes(filter))

  // The puzzle on the board: the one picked or pinned, else the head of today's
  // queue (or of the list in free practice). Finishing a puzzle pins it, so it
  // stays on screen after its card leaves the queue.
  const current: Entry | undefined =
    (currentId ? byId.get(currentId) : undefined) ??
    (mode === "today" ? byId.get(queueIds[0] ?? "") : (visible.find((e) => !outcomes[e.puzzle.id]) ?? visible[0]))
  const nextId =
    mode === "today"
      ? queueIds.find((id) => id !== current?.puzzle.id)
      : visible.find((e) => e.puzzle.id !== current?.puzzle.id && !outcomes[e.puzzle.id])?.puzzle.id

  const select = (id: string) => {
    setCurrentId(id)
    // Keep the address shareable within this browser without a navigation
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`)
  }

  const finish = (puzzle: Puzzle, outcome: SolveOutcome, durationMs: number) => {
    setCurrentId(puzzle.id)
    setOutcomes((o) => ({ ...o, [puzzle.id]: outcome }))
    void recordAttempt(puzzle, outcome, durationMs).then(({ card, grade }) =>
      setSaved((s) => ({ ...s, [puzzle.id]: { due: card.due, grade, savedAt: Date.now() } })),
    )
  }

  const todayDone = mode === "today" && !queueIds.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Puzzles</h1>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{queue.due.length} due</span> · {queue.fresh.length} new left today ·{" "}
            {reviewedToday} done today · {entries.length} in total
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ToggleGroup
            value={[mode]}
            onValueChange={(value) => {
              if (!value[0]) return
              setMode(value[0] as Mode)
              setCurrentId(null)
            }}
            variant="outline"
            aria-label="Practice mode"
          >
            <ToggleGroupItem value="today" className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              Today
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              All puzzles
            </ToggleGroupItem>
          </ToggleGroup>
          {queueState.current && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <Cpu className="size-3.5 animate-pulse text-primary" aria-hidden /> Finding more in the background
            </p>
          )}
        </div>
      </header>

      {todayDone && !current && <DoneForToday nextDue={queue.nextDue} now={now} onPractice={() => setMode("all")} />}

      {current && (
        <PuzzleSolver
          key={current.puzzle.id}
          puzzle={current.puzzle}
          game={current.game}
          review={saved[current.puzzle.id] ?? null}
          onFinished={(outcome, durationMs) => finish(current.puzzle, outcome, durationMs)}
          onNext={nextId ? () => select(nextId) : null}
        />
      )}

      {todayDone && current && outcomes[current.puzzle.id] && (
        <DoneForToday nextDue={queue.nextDue} now={now} onPractice={() => setMode("all")} />
      )}

      {mode === "today" ? (
        queueIds.length > 0 && (
          <section aria-labelledby="up-next" className="flex flex-col gap-3">
            <h2 id="up-next" className="text-lg font-semibold">
              Up next
            </h2>
            <PuzzleGrid
              entries={queueIds.map((id) => byId.get(id)!)}
              cards={cards}
              outcomes={outcomes}
              currentId={current?.puzzle.id}
              now={now}
              onSelect={select}
            />
          </section>
        )
      ) : (
        <section aria-labelledby="all-puzzles" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="all-puzzles" className="text-lg font-semibold">
              All puzzles
            </h2>
            <ThemeFilter entries={entries} filter={filter} onChange={setFilter} />
          </div>
          <PuzzleGrid
            entries={visible}
            cards={cards}
            outcomes={outcomes}
            currentId={current?.puzzle.id}
            now={now}
            onSelect={select}
          />
        </section>
      )}
    </div>
  )
}

function NoPuzzles({ analyzing }: { analyzing: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Puzzles</h1>
      <div className="flex flex-col items-start gap-4 rounded-xl p-6 ring-1 ring-foreground/10">
        <PuzzleIcon className="size-6 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">No puzzles yet</p>
          <p className="text-sm text-muted-foreground">
            Puzzles come from your own mistakes and blunders. Open an account and analyze its games; each game is
            checked for positions with one clearly best move.
          </p>
        </div>
        {analyzing && (
          <p className="flex items-center gap-2 text-sm" role="status">
            <Cpu className="size-4 animate-pulse text-primary" aria-hidden /> Analysis is running…
          </p>
        )}
        <RecentAccounts />
      </div>
    </div>
  )
}

function DoneForToday({ nextDue, now, onPractice }: { nextDue: number | null; now: number; onPractice: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CalendarCheck className="mt-0.5 size-5 shrink-0 text-best" aria-hidden />
        <div>
          <p className="font-medium">That&apos;s everything for today</p>
          <p className="text-sm text-muted-foreground">
            {nextDue ? `Next review in ${formatInterval(nextDue, now)}.` : "No reviews scheduled yet."} Up to{" "}
            {NEW_PER_DAY} new puzzles are added each day.
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={onPractice}>
        Practice more
      </Button>
    </div>
  )
}

function ThemeFilter({
  entries,
  filter,
  onChange,
}: {
  entries: Entry[]
  filter: Filter
  onChange: (filter: Filter) => void
}) {
  const counts = new Map<Filter, number>([["all", entries.length]])
  for (const { puzzle } of entries) for (const t of puzzle.themes) counts.set(t, (counts.get(t) ?? 0) + 1)

  return (
    <ToggleGroup
      value={[filter]}
      onValueChange={(value) => value[0] && onChange(value[0] as Filter)}
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
  )
}

function PuzzleGrid({
  entries,
  cards,
  outcomes,
  currentId,
  now,
  onSelect,
}: {
  entries: Entry[]
  cards: Map<string, ReviewCard>
  outcomes: Record<string, SolveOutcome>
  currentId: string | undefined
  now: number
  onSelect: (id: string) => void
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ puzzle, game }) => (
        <li key={puzzle.id}>
          <PuzzleItem
            puzzle={puzzle}
            game={game}
            card={cards.get(puzzle.id)}
            outcome={outcomes[puzzle.id]}
            active={puzzle.id === currentId}
            now={now}
            onSelect={() => onSelect(puzzle.id)}
          />
        </li>
      ))}
    </ul>
  )
}

function PuzzleItem({
  puzzle,
  game,
  card,
  outcome,
  active,
  now,
  onSelect,
}: {
  puzzle: Puzzle
  game: Game | undefined
  card: ReviewCard | undefined
  outcome: SolveOutcome | undefined
  active: boolean
  now: number
  onSelect: () => void
}) {
  const opponent = game && (game.userColor === "white" ? game.black : game.white)
  const themes = puzzle.themes
    .map((t) => (t === "mate" && puzzle.mateIn ? `Mate in ${puzzle.mateIn}` : THEME_LABELS[t]))
    .join(" · ")
  const schedule = !card ? "New" : card.due <= now ? "Due now" : `In ${formatInterval(card.due, now)}`

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
          {game && ` · ${formatRelative(game.playedAt, now)}`}
        </span>
      </span>
      <span
        className={`shrink-0 text-xs ${!card ? "text-primary" : card.due <= now ? "text-mistake" : "text-muted-foreground"}`}
      >
        {schedule}
      </span>
      {outcome === "failed" ? (
        <CircleX className="size-4 shrink-0 text-blunder" aria-label="Missed this session" />
      ) : outcome ? (
        <CircleCheck className="size-4 shrink-0 text-best" aria-label="Solved this session" />
      ) : null}
    </button>
  )
}
