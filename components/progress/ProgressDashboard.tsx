"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { TrendingUp } from "lucide-react"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { BreakdownTable } from "@/components/progress/BreakdownTable"
import { StatTile } from "@/components/progress/StatTile"
import { TrendChart } from "@/components/progress/TrendChart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { db } from "@/lib/db/schema"
import { plural } from "@/lib/format"
import { PLATFORM_LABELS } from "@/lib/sources/normalize"
import {
  byOpening,
  byPhase,
  byPressure,
  summarize,
  weeklyTrends,
  weekStart,
  type PeriodSummary,
} from "@/lib/stats/aggregate"
import type { GameStats } from "@/lib/stats/gameStats"
import { loadAccountStats, type AccountStats } from "@/lib/stats/load"
import { useNow } from "@/lib/useNow"

type Range = "4" | "12" | "all"
type SpeedFilter = "all" | "bullet" | "blitz" | "slow"

const WEEK = 7 * 24 * 3600_000
const RANGES: { id: Range; label: string }[] = [
  { id: "4", label: "Last 4 weeks" },
  { id: "12", label: "Last 12 weeks" },
  { id: "all", label: "All time" },
]
const SPEEDS: { id: SpeedFilter; label: string }[] = [
  { id: "all", label: "All speeds" },
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "slow", label: "Rapid & classical" },
]

const percent = (v: number) => `${Math.round(v)}%`

/** "+3.2 pts" style change between two periods, judged by which direction is good. */
function change(current: number | null, previous: number | null, higherIsBetter: boolean, unit: string, digits = 0) {
  if (current === null || previous === null) return null
  const diff = current - previous
  const rounded = Number(diff.toFixed(digits))
  if (rounded === 0) return { text: `no change vs previous period`, direction: "flat" as const, good: null }
  return {
    text: `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}${unit} vs previous period`,
    direction: rounded > 0 ? ("up" as const) : ("down" as const),
    good: rounded > 0 === higherIsBetter,
  }
}

/**
 * Progress over time for one account: headline numbers with their change,
 * weekly trends, and where mistakes cluster (opening, game phase, clock).
 * Built only from data already stored (games with complete evals and the
 * puzzle review log), so history appears as soon as games are analyzed.
 */
export function ProgressDashboard() {
  const accounts = useLiveQuery(async () => (await db.accounts.toArray()).sort((a, b) => b.lastSyncedAt - a.lastSyncedAt))
  // A cheap change signal: reload stats when a game finishes or a puzzle is attempted
  const signal = useLiveQuery(async () => `${await db.analyses.count()}:${await db.reviews.count()}`)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [range, setRange] = useState<Range>("12")
  const [speed, setSpeed] = useState<SpeedFilter>("all")
  const [loaded, setLoaded] = useState<{ account: string; signal: string; stats: AccountStats } | null>(null)
  const now = useNow(60_000)

  const account = accounts?.find((a) => a.id === accountId) ?? accounts?.[0]

  useEffect(() => {
    if (!account || signal === undefined) return
    let cancelled = false
    void loadAccountStats(account.id).then((stats) => {
      if (!cancelled) setLoaded({ account: account.id, signal, stats })
    })
    return () => {
      cancelled = true
    }
  }, [account, signal])

  if (accounts === undefined || !now) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden />
  if (!account) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <div className="flex flex-col items-start gap-4 rounded-xl p-6 ring-1 ring-foreground/10">
          <TrendingUp className="size-6 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Import an account first; progress is measured from its games.</p>
          <RecentAccounts />
        </div>
      </div>
    )
  }
  if (!loaded) return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden />

  // While a different account or newer data loads, keep showing the last result, dimmed
  const refreshing = loaded.account !== account.id || loaded.signal !== signal
  const { stats } = loaded
  const [, username] = account.id.split(":")

  // Filters scope everything below them
  const speedMatch = (g: GameStats) =>
    speed === "all" || (speed === "slow" ? g.speed === "rapid" || g.speed === "classical" : g.speed === speed)
  const from = range === "all" ? 0 : weekStart(now) - (Number(range) - 1) * WEEK
  const previousFrom = range === "all" ? 0 : from - Number(range) * WEEK
  const games = stats.games.filter((g) => speedMatch(g) && g.playedAt >= from)
  const reviews = stats.reviews.filter((r) => r.reviewedAt >= from)
  const current = summarize(games, reviews)
  const previous: PeriodSummary | null =
    range === "all"
      ? null
      : summarize(
          stats.games.filter((g) => speedMatch(g) && g.playedAt >= previousFrom && g.playedAt < from),
          stats.reviews.filter((r) => r.reviewedAt >= previousFrom && r.reviewedAt < from),
        )

  const weeks = weeklyTrends(games, reviews)
  const phases = byPhase(games)
  const pressure = byPressure(games)
  const openings = byOpening(games).slice(0, 10)

  return (
    <div className={`flex flex-col gap-8 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Based on {stats.games.length} of {stats.totalGames} games analyzed for {account.username} ·{" "}
          {PLATFORM_LABELS[account.platform]}.{" "}
          {stats.games.length < stats.totalGames && (
            <Link href={`/u/${account.platform}/${username}`} className="text-primary underline-offset-4 hover:underline">
              Analyze the rest
            </Link>
          )}
        </p>
      </header>

      {/* One row of filters, above everything they scope */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as Range)} variant="outline" size="sm" aria-label="Date range">
          {RANGES.map((r) => (
            <ToggleGroupItem key={r.id} value={r.id} className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup value={[speed]} onValueChange={(v) => v[0] && setSpeed(v[0] as SpeedFilter)} variant="outline" size="sm" aria-label="Game speed">
          {SPEEDS.map((s) => (
            <ToggleGroupItem key={s.id} value={s.id} className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {accounts.length > 1 && (
          <select
            value={account.id}
            onChange={(event) => setAccountId(event.target.value)}
            className="h-7 rounded-lg border border-input bg-input/30 px-2 text-sm"
            aria-label="Account"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.username} · {PLATFORM_LABELS[a.platform]}
              </option>
            ))}
          </select>
        )}
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Games analyzed" value={String(current.games)} detail={previous ? `${previous.games} the period before` : undefined} />
        <StatTile
          label="Accuracy"
          value={current.accuracy === null ? "–" : percent(current.accuracy)}
          change={previous && change(current.accuracy, previous.accuracy, true, " pts")}
        />
        <StatTile
          label="Blunders per 100 moves"
          value={current.blunderRate === null ? "–" : current.blunderRate.toFixed(1)}
          change={previous && change(current.blunderRate, previous.blunderRate, false, "", 1)}
        />
        <StatTile
          label="Puzzles solved cleanly"
          value={current.puzzleClean === null ? "–" : percent(current.puzzleClean * 100)}
          detail={`${plural(current.puzzles, "attempt")} · all speeds`}
          change={previous && change(current.puzzleClean && current.puzzleClean * 100, previous.puzzleClean && previous.puzzleClean * 100, true, " pts")}
        />
      </section>

      {weeks.length > 0 ? (
        <section aria-labelledby="trends" className="flex flex-col gap-3">
          <h2 id="trends" className="text-lg font-semibold">
            Week by week
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChart title="Accuracy" data={weeks.map((w) => ({ week: w.week, value: w.accuracy }))} format={percent} domain={[0, 100]} />
            <TrendChart
              title="Blunders per 100 moves"
              data={weeks.map((w) => ({ week: w.week, value: w.blunderRate }))}
              format={(v) => v.toFixed(1)}
            />
            <TrendChart
              title="Puzzles solved cleanly"
              data={weeks.map((w) => ({ week: w.week, value: w.puzzleClean === null ? null : w.puzzleClean * 100 }))}
              format={percent}
              domain={[0, 100]}
              empty="No puzzle attempts in this period"
            />
          </div>
          <details className="text-sm">
            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">Show as a table</summary>
            <div className="mt-3 overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
              <table className="w-full">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    {["Week of", "Games", "Accuracy", "Blunders / 100", "Puzzles", "Solved cleanly"].map((h, i) => (
                      <th key={h} className={`px-4 py-2 font-normal ${i ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...weeks].reverse().map((w) => (
                    <tr key={w.week} className="border-b last:border-0">
                      <td className="px-4 py-1.5">{new Date(w.week).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                      <td className="px-4 py-1.5 text-right">{w.games}</td>
                      <td className="px-4 py-1.5 text-right">{w.accuracy === null ? "–" : percent(w.accuracy)}</td>
                      <td className="px-4 py-1.5 text-right">{w.blunderRate === null ? "–" : w.blunderRate.toFixed(1)}</td>
                      <td className="px-4 py-1.5 text-right">{w.puzzles}</td>
                      <td className="px-4 py-1.5 text-right">{w.puzzleClean === null ? "–" : percent(w.puzzleClean * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      ) : (
        <p className="rounded-xl p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No analyzed games or puzzle attempts in this period.
        </p>
      )}

      {games.length > 0 && (
        <>
          <section aria-labelledby="by-phase" className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 id="by-phase" className="text-lg font-semibold">
                By game phase
              </h2>
              <BreakdownTable
                head="Phase"
                rows={(["opening", "middlegame", "endgame"] as const).map((phase) => ({
                  key: phase,
                  label: phase[0].toUpperCase() + phase.slice(1),
                  count: phases[phase].moves,
                  countLabel: "Moves",
                  errorRate: phases[phase].errorRate,
                  accuracy: phases[phase].accuracy,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Opening is the first 10 moves; endgame starts when the pieces left (not pawns) add up to two rooks and a
                minor piece each or less.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Under time pressure</h2>
              <BreakdownTable
                head="Clock"
                rows={[
                  { key: "calm", label: "Plenty of time", ...pressure.calm },
                  { key: "pressure", label: "Time pressure", ...pressure.pressure },
                ].map((r) => ({ ...r, count: r.moves, countLabel: "Moves" }))}
              />
              <p className="text-xs text-muted-foreground">
                Time pressure is under 30 seconds, or under 10% of the starting time, whichever comes first. Games
                without clock data are left out.
              </p>
            </div>
          </section>

          <section aria-labelledby="by-opening" className="flex flex-col gap-3">
            <h2 id="by-opening" className="text-lg font-semibold">
              By opening
            </h2>
            <BreakdownTable
              head="Opening"
              extraHead="Score"
              rows={openings.map((o) => ({
                key: `${o.opening}|${o.color}`,
                label: (
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 rounded-sm ${o.color === "white" ? "bg-white" : "bg-neutral-950 ring-1 ring-neutral-300"}`}
                      aria-label={`as ${o.color}`}
                    />
                    {o.opening}
                  </span>
                ),
                count: o.games,
                countLabel: "Games",
                extra: percent(o.score * 100),
                errorRate: o.errorRate,
                accuracy: o.accuracy,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Your 10 most played opening families, by color. Score counts a win as 1 and a draw as ½.{" "}
              <Link href="/openings" className="text-primary underline-offset-4 hover:underline">
                Drill your weak spots
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  )
}
