"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Chess } from "chess.js"
import { useLiveQuery } from "dexie-react-hooks"
import { BookOpen, CalendarCheck, Cpu, Square } from "lucide-react"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { OpeningDrill } from "@/components/openings/OpeningDrill"
import { OpeningExplorer } from "@/components/openings/OpeningExplorer"
import { WeakSpotList } from "@/components/openings/WeakSpotList"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { db, gamesForAccount } from "@/lib/db/schema"
import { ANALYSIS_DEPTH } from "@/lib/engine/analyzeGame"
import { analysisQueue } from "@/lib/engine/queue"
import { buildTree } from "@/lib/openings/buildTree"
import { findWeakSpots, MIN_REACHED } from "@/lib/openings/deviations"
import { PLATFORM_LABELS } from "@/lib/sources/normalize"
import { dailyQueue } from "@/lib/srs/dailyQueue"
import { recordReview } from "@/lib/srs/record"
import { formatInterval } from "@/lib/srs/scheduler"
import type { Color, PositionEval, SolveOutcome } from "@/lib/types"
import { useNow } from "@/lib/useNow"

/** Fewer new opening drills a day than puzzles: each one is a habit to change. */
const NEW_DRILLS_PER_DAY = 5

type Mode = "drill" | "explore"
type Saved = { due: number; grade: number; savedAt: number }

function playFen(fen: string, uci: string): string {
  const chess = new Chess(fen)
  chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return chess.fen()
}

/**
 * The opening trainer for one account and color: today's drills on your
 * weak spots, the ranked list of them, and an explorer for your whole tree.
 * The tree and weak spots are recomputed from your games and cached evals
 * each time, so they grow as more games are imported and analyzed.
 */
export function OpeningTrainer() {
  const accounts = useLiveQuery(async () => (await db.accounts.toArray()).sort((a, b) => b.lastSyncedAt - a.lastSyncedAt))
  const [accountId, setAccountId] = useState<string | null>(null)
  const [color, setColor] = useState<Color>("white")
  const [mode, setMode] = useState<Mode>("drill")
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, Saved>>({})
  const now = useNow(30_000)

  const account = accounts?.find((a) => a.id === accountId) ?? accounts?.[0]
  const data = useLiveQuery(async () => {
    if (!account) return null
    const games = await gamesForAccount(account.id).toArray()
    const tree = buildTree(games, color)
    const keys = [...tree.nodes.keys()]
    const evals = new Map<string, PositionEval>()
    for (const entry of await db.evals.bulkGet(keys)) if (entry && entry.depth >= ANALYSIS_DEPTH) evals.set(entry.key, entry)
    const cards = await db.cards.where("kind").equals("opening").toArray()
    // Judging a weak spot needs evals for the position and every move out of it
    const missing = new Map<string, string>()
    for (const node of tree.nodes.values()) {
      if (node.toMove !== color || node.games < MIN_REACHED) continue
      if (!evals.has(node.key)) missing.set(node.key, node.fen)
      for (const move of node.moves.values()) {
        if (!evals.has(move.next)) missing.set(move.next, tree.nodes.get(move.next)?.fen ?? playFen(node.fen, move.uci))
      }
    }
    return {
      tree,
      evals,
      spots: findWeakSpots(tree, evals, account.id),
      cards: new Map(cards.map((c) => [c.refId, c])),
      games: games.filter((g) => g.userColor === color).length,
      missing: [...missing.values()],
    }
  }, [account?.id, color])
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null)
  const stopScan = useRef(false)

  if (accounts === undefined || (account && data === undefined) || !now) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden />
  }
  if (!account || !data) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl p-6 ring-1 ring-foreground/10">
        <BookOpen className="size-6 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Import an account first; the opening tree is built from its games.</p>
        <RecentAccounts />
      </div>
    )
  }

  const { tree, evals, spots, cards, missing } = data

  // Evaluates just the missing opening positions, one at a time through the
  // shared engine; each result lands in the cache and the page updates live
  const scanOpenings = async () => {
    stopScan.current = false
    setScan({ done: 0, total: missing.length })
    for (const [i, fen] of missing.entries()) {
      if (stopScan.current || !analysisQueue) break
      await analysisQueue.evaluate(fen)
      setScan({ done: i + 1, total: missing.length })
    }
    setScan(null)
  }
  const byId = new Map(spots.map((s) => [s.id, s]))
  const queue = dailyQueue(spots, cards, now, NEW_DRILLS_PER_DAY)
  const queueIds = [...queue.due, ...queue.fresh].map((s) => s.id)
  const current = (currentId ? byId.get(currentId) : undefined) ?? byId.get(queueIds[0] ?? "")
  const nextId = queueIds.find((id) => id !== current?.id)
  const [, username] = account.id.split(":")

  const finish = (outcome: SolveOutcome, durationMs: number) => {
    if (!current) return
    const spot = current
    setCurrentId(spot.id)
    void recordReview({ kind: "opening", refId: spot.id, account: spot.account }, outcome, durationMs, 1).then(
      ({ card, grade }) => setSaved((s) => ({ ...s, [spot.id]: { due: card.due, grade, savedAt: Date.now() } })),
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Openings</h1>
          <p className="text-sm text-muted-foreground">
            {data.games} games as {color} · {spots.length} weak {spots.length === 1 ? "spot" : "spots"} ·{" "}
            <span className="text-foreground">{queue.due.length} due</span> · {queue.fresh.length} new today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {accounts.length > 1 && (
            <select
              value={account.id}
              onChange={(event) => {
                setAccountId(event.target.value)
                setCurrentId(null)
                setFocus(null)
              }}
              className="h-8 rounded-lg border border-input bg-input/30 px-2 text-sm"
              aria-label="Account"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username} · {PLATFORM_LABELS[a.platform]}
                </option>
              ))}
            </select>
          )}
          <ToggleGroup
            value={[color]}
            onValueChange={(value) => {
              if (!value[0]) return
              setColor(value[0] as Color)
              setCurrentId(null)
              setFocus(null)
            }}
            variant="outline"
            aria-label="Color"
          >
            {(["white", "black"] as const).map((c) => (
              <ToggleGroupItem key={c} value={c} className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
                As {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            value={[mode]}
            onValueChange={(value) => value[0] && setMode(value[0] as Mode)}
            variant="outline"
            aria-label="Mode"
          >
            <ToggleGroupItem value="drill" className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              Drill
            </ToggleGroupItem>
            <ToggleGroupItem value="explore" className="aria-pressed:border-primary/60 aria-pressed:text-foreground">
              Explore
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      {(missing.length > 0 || scan) && (
        <div className="flex flex-col gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground" role="status">
            {scan ? (
              <>
                Analyzing opening positions · {scan.done} of {scan.total}
              </>
            ) : (
              <>
                {missing.length} opening {missing.length === 1 ? "position" : "positions"} you reach repeatedly
                {missing.length === 1 ? " isn't" : " aren't"} analyzed yet, so some weak spots may be missing. This takes
                about {Math.max(1, Math.round((missing.length * 0.25) / 60))} min, or{" "}
                <Link href={`/u/${account.platform}/${username}`} className="text-primary underline-offset-4 hover:underline">
                  analyze whole games
                </Link>{" "}
                for puzzles too.
              </>
            )}
          </p>
          {scan ? (
            <Button variant="ghost" size="sm" onClick={() => (stopScan.current = true)}>
              <Square aria-hidden /> Stop
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void scanOpenings()}>
              <Cpu aria-hidden /> Analyze opening positions
            </Button>
          )}
        </div>
      )}

      {mode === "explore" ? (
        <OpeningExplorer key={`${account.id}:${color}:${focus}`} tree={tree} evals={evals} focus={focus} />
      ) : current ? (
        <OpeningDrill
          key={current.id}
          spot={current}
          review={saved[current.id] ?? null}
          onFinished={finish}
          onNext={nextId ? () => setCurrentId(nextId) : null}
        />
      ) : (
        <div className="flex items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-best" aria-hidden />
          <div>
            <p className="font-medium">{spots.length ? "No drills due right now" : "No weak spots found yet"}</p>
            <p className="text-sm text-muted-foreground">
              {spots.length
                ? queue.nextDue
                  ? `Next drill in ${formatInterval(queue.nextDue, now)}. Pick any weak spot below to practice it now.`
                  : "Pick any weak spot below to practice it."
                : `A weak spot is a position you've reached in ${MIN_REACHED}+ games and left with a costly move. Import and analyze more games to find them.`}
            </p>
          </div>
        </div>
      )}

      {spots.length > 0 && (
        <section aria-labelledby="weak-spots" className="flex flex-col gap-3">
          <h2 id="weak-spots" className="text-lg font-semibold">
            Weak spots as {color}
          </h2>
          <WeakSpotList
            spots={spots}
            cards={cards}
            now={now}
            currentId={mode === "drill" ? current?.id : undefined}
            onDrill={(id) => {
              setCurrentId(id)
              setMode("drill")
            }}
            onExplore={(key) => {
              setFocus(key)
              setMode("explore")
            }}
          />
        </section>
      )}
    </div>
  )
}
