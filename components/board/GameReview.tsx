"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { BoardControls } from "@/components/board/BoardControls"
import { MoveList } from "@/components/board/MoveList"
import { PlayerBar } from "@/components/board/PlayerBar"
import { ReviewBoard } from "@/components/board/ReviewBoard"
import { clocksAt, replayMoves } from "@/lib/chess/positions"
import { db } from "@/lib/db/schema"
import { formatOutcome, formatScore, formatTimeControl, SPEED_LABELS } from "@/lib/format"
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
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<Color>(game.userColor)

  const select = (target: number) => setPly(Math.max(0, Math.min(lastPly, target)))
  const flip = () => setOrientation((o) => (o === "white" ? "black" : "white"))

  // Arrow keys step through the game (same bindings as Lichess); F flips
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable]")) return

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
      <header className="flex flex-col gap-2">
        <Link
          href={`/u/${game.platform}/${username}`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> All games
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">vs {opponent.name}</h1>
          <span className="text-sm text-muted-foreground">
            {formatOutcome(game)} · {SPEED_LABELS[game.speed]} {formatTimeControl(game.timeControl)} ·{" "}
            {new Date(game.playedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-1">
          {bar(orientation === "white" ? "black" : "white")}
          <ReviewBoard position={positions[ply]} orientation={orientation} />
          {bar(orientation)}
          {/* On phones the controls sit under the board; on desktop, under the move list */}
          <div className="pt-2 lg:hidden">{controls}</div>
        </div>

        <aside className="flex flex-col rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{game.opening.name ?? "Unknown opening"}</p>
              {game.opening.eco && <p className="font-mono text-xs text-muted-foreground">{game.opening.eco}</p>}
            </div>
            <a
              href={game.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {PLATFORM_LABELS[game.platform]} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          <MoveList
            positions={positions}
            ply={ply}
            onSelect={select}
            footer={
              <p className="border-t px-4 py-2 text-center text-sm text-muted-foreground">
                <span className="font-mono">{formatScore(game)}</span> · {formatOutcome(game)}
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
      <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

function MissingGame() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10">
      <p>This game isn&apos;t in this browser&apos;s library.</p>
      <p className="text-sm text-muted-foreground">
        Games are stored locally. Import the account that played it, then open it from the game list.
      </p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Import games
      </Link>
    </div>
  )
}
