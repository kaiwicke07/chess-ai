"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeft, ExternalLink, Play, Swords } from "lucide-react"
import type { Arrow } from "react-chessboard"

import { BoardControls } from "@/components/board/BoardControls"
import { EngineLine } from "@/components/board/EngineLine"
import { EvalBar } from "@/components/board/EvalBar"
import { EvalGraph } from "@/components/board/EvalGraph"
import { MoveList } from "@/components/board/MoveList"
import { PlayerBar } from "@/components/board/PlayerBar"
import { ReviewBoard } from "@/components/board/ReviewBoard"
import { AccuracySummary } from "@/components/review/AccuracySummary"
import { BEST_COLOR, JUDGEMENT_COLORS } from "@/components/review/judgementStyles"
import { MoveFeedback } from "@/components/review/MoveFeedback"
import { ShareMenu } from "@/components/review/ShareMenu"
import { buttonVariants } from "@/components/ui/button"
import { gameAccuracy } from "@/lib/analysis/accuracy"
import { assessMoves } from "@/lib/analysis/classify"
import { clocksAt, replayMoves } from "@/lib/chess/positions"
import { explainMove } from "@/lib/explain/templates"
import { db } from "@/lib/db/schema"
import { useAnalysisQueue } from "@/lib/engine/useAnalysisQueue"
import { useGameEvals } from "@/lib/engine/useGameEvals"
import { formatOutcome, formatScore, formatTimeControl, SPEED_LABELS } from "@/lib/format"
import { playSound, soundForSan } from "@/lib/sound"
import { PLATFORM_LABELS } from "@/lib/sources/normalize"
import type { Color, Game } from "@/lib/types"

export function GameReview({ gameId }: { gameId: string }) {
  // undefined while loading, null if this browser doesn't have the game
  const game = useLiveQuery(async () => (await db.games.get(gameId)) ?? null, [gameId])

  if (game === undefined) return <ReviewSkeleton />
  if (game === null) return <MissingGame />
  // Keyed so ply and orientation reset when navigating to another game
  return <Review key={game.id} game={game} />
}

function Review({ game }: { game: Game }) {
  const positions = useMemo(() => replayMoves(game.moves), [game.moves])
  const lastPly = positions.length - 1
  // A #ply=N link (from a puzzle) opens the game at that position. Review
  // only renders in the browser, after the game loads, so window is safe here.
  const [ply, setPly] = useState(() => {
    const fromHash = Number(window.location.hash.match(/ply=(\d+)/)?.[1])
    return Number.isInteger(fromHash) ? Math.min(fromHash, positions.length - 1) : 0
  })
  const [orientation, setOrientation] = useState<Color>(game.userColor)
  const evals = useGameEvals(game.id, positions)
  const queue = useAnalysisQueue()
  const progress = queue.current?.gameId === game.id ? queue.current : null

  // Everything below derives from the evals; moves fill in as analysis runs
  const assessments = useMemo(
    () => (evals ? assessMoves(positions, evals) : positions.map(() => null)),
    [positions, evals],
  )
  // Puzzles start on the position before the user's mistake, so key by that ply
  const puzzles = useLiveQuery(
    async () => new Map((await db.puzzles.where("gameId").equals(game.id).toArray()).map((p) => [p.ply, p.id])),
    [game.id],
  )
  const accuracy = useMemo(
    () => (evals?.every(Boolean) ? gameAccuracy(evals.map((entry) => entry!.eval)) : null),
    [evals],
  )

  const select = (target: number) => setPly(Math.max(0, Math.min(lastPly, target)))
  const flip = () => setOrientation((o) => (o === "white" ? "black" : "white"))

  // Arrow keys step through the game (same bindings as Lichess); F flips
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      // Don't steal keys from form fields (target can be a non-element, e.g. window)
      const target = event.target
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]")) return

      const steps: Record<string, (p: number) => number> = {
        ArrowLeft: (p) => p - 1,
        ArrowRight: (p) => p + 1,
        ArrowUp: () => 0,
        ArrowDown: () => lastPly,
        Home: () => 0,
        End: () => lastPly,
      }
      const step = steps[event.key]
      if (step) {
        event.preventDefault()
        setPly((p) => Math.max(0, Math.min(lastPly, step(p))))
      } else if (event.key === "f") {
        setOrientation((o) => (o === "white" ? "black" : "white"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [lastPly])

  // Stepping forward one move plays its sound; jumps and steps back stay quiet
  const shownPly = useRef(ply)
  useEffect(() => {
    const san = positions[ply].lastMove?.san
    if (ply === shownPly.current + 1 && san) playSound(soundForSan(san))
    shownPly.current = ply
  }, [ply, positions])

  // The move that led to the shown position, its verdict, and arrows for it:
  // what was played (in the judgement's color) and what Stockfish preferred
  const move = positions[ply].lastMove
  const current = assessments[ply]
  const before = evals?.[ply - 1]
  const after = evals?.[ply]
  const explanation =
    move && current?.judgement && before && after
      ? explainMove({ fen: positions[ply - 1].fen, uci: move.uci, assessment: current, before, after })
      : null
  const arrows: Arrow[] = []
  if (move && current?.judgement) {
    arrows.push({ startSquare: move.from, endSquare: move.to, color: JUDGEMENT_COLORS[current.judgement] })
    if (before?.best && before.best !== move.uci) {
      arrows.push({ startSquare: before.best.slice(0, 2), endSquare: before.best.slice(2, 4), color: BEST_COLOR })
    }
  }

  const clocks = clocksAt(game, ply)
  // Nobody is on the move once the game is over
  const toMove: Color | null = ply === lastPly ? null : ply % 2 === 0 ? "white" : "black"
  const opponent = game.userColor === "white" ? game.black : game.white
  const [, username] = game.account.split(":")
  const controls = <BoardControls ply={ply} lastPly={lastPly} onSelect={select} onFlip={flip} />
  const bar = (color: Color) => (
    <PlayerBar
      player={game[color]}
      color={color}
      clock={clocks ? clocks[color] : null}
      toMove={toMove === color}
      isUser={color === game.userColor}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {/* The spread opens with a heavy ink rule under the title, like a magazine headline */}
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Link href={`/u/${game.platform}/${username}`} className="flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            <ArrowLeft className="size-4" aria-hidden /> All games
          </Link>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="page-title min-w-0 break-words">vs {opponent.name}</h1>
            <span className="text-sm text-muted-foreground">
              {formatOutcome(game)} · {SPEED_LABELS[game.speed]} {formatTimeControl(game.timeControl)} ·{" "}
              {new Date(game.playedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </span>
          </div>
        </div>
        {/* Replay against Stockfish: from the shown move, or from where the game turned */}
        <div className="flex flex-wrap items-center gap-2">
          {game.result !== "win" && (
            <Link href={`/play/${game.platform}/${game.sourceId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Swords aria-hidden /> Replay the turning point
            </Link>
          )}
          {ply < lastPly && (
            <Link
              href={`/play/${game.platform}/${game.sourceId}#ply=${ply}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <Play aria-hidden /> Play from here
            </Link>
          )}
          <ShareMenu game={game} fen={positions[ply].fen} orientation={orientation} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-1">
          {bar(orientation === "white" ? "black" : "white")}
          <div className="flex gap-2">
            <EvalBar evaluation={evals?.[ply]?.eval} orientation={orientation} />
            <div className="min-w-0 flex-1">
              <ReviewBoard position={positions[ply]} orientation={orientation} arrows={arrows} />
            </div>
          </div>
          {bar(orientation)}
          {/* On phones the controls sit under the board; on desktop, under the move list */}
          <div className="pt-2 lg:hidden">{controls}</div>
        </div>

        {/* The annotation column: a lighter sheet under a heavy ink rule, rows split by hairlines */}
        <aside className="flex min-w-0 flex-col border-t border-border rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-display text-2xl text-balance">{game.opening.name ?? "Unknown opening"}</p>
              {game.opening.eco && <p className="font-mono text-xs text-muted-foreground">{game.opening.eco}</p>}
            </div>
            <a
              href={game.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              {PLATFORM_LABELS[game.platform]} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          {accuracy && <AccuracySummary game={game} accuracy={accuracy} assessments={assessments} />}
          <EngineLine fen={positions[ply].fen} entry={evals?.[ply]} progress={progress} error={queue.error} />
          {move && current && (
            <MoveFeedback
              san={move.san}
              assessment={current}
              explanation={explanation}
              puzzleId={puzzles?.get(ply - 1) ?? null}
            />
          )}
          {evals && <EvalGraph evals={evals} assessments={assessments} ply={ply} onSelect={select} />}

          <MoveList
            positions={positions}
            assessments={assessments}
            ply={ply}
            onSelect={select}
            footer={
              <p className="border-t px-4 py-2 text-center text-sm text-muted-foreground">
                <span className="font-mono font-bold text-foreground tabular-nums">{formatScore(game)}</span> · {formatOutcome(game)}
              </p>
            }
          />

          <div className="hidden border-t p-2 lg:block">{controls}</div>
        </aside>
      </div>
    </div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)]" aria-hidden>
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="h-96 animate-pulse border-t border-border bg-muted" />
    </div>
  )
}

function MissingGame() {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-border rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <p>This game isn&apos;t in this browser&apos;s library.</p>
      <p className="text-sm text-muted-foreground">
        Games are stored locally. Import the account that played it, then open it from the game list.
      </p>
      <Link
        href="/"
        className="text-xs font-semibold text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        Import games
      </Link>
    </div>
  )
}
