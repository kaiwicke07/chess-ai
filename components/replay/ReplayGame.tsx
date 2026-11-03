"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Chess } from "chess.js"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Play, RotateCcw, Undo2 } from "lucide-react"

import { InteractiveBoard } from "@/components/board/InteractiveBoard"
import { ReviewBoard } from "@/components/board/ReviewBoard"
import { ReviewSkeleton } from "@/components/board/GameReview"
import { ReplayAnalysis } from "@/components/replay/ReplayAnalysis"
import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { assessMoves, JUDGEMENT_GLYPHS } from "@/lib/analysis/classify"
import { replayMoves } from "@/lib/chess/positions"
import { numberMoves } from "@/lib/chess/san"
import { db } from "@/lib/db/schema"
import { Opponent, STRENGTHS, type Strength } from "@/lib/engine/opponent"
import { useGameEvals } from "@/lib/engine/useGameEvals"
import { formatOutcome } from "@/lib/format"
import { criticalPly } from "@/lib/replay/criticalPosition"
import { replayOutcome, type ReplayOutcome } from "@/lib/replay/outcome"
import type { Game } from "@/lib/types"

/** Pause before the opponent's move appears, so the user's move lands first. */
const MIN_REPLY_MS = 400

/** "Start after 15… Re8": ply 30 was black's 15th move, ply 29 white's. */
function startLabel(ply: number, san: string | undefined): string {
  if (!ply || !san) return "Start from the first move"
  const number = Math.ceil(ply / 2)
  return `Start after ${number}${ply % 2 === 1 ? "." : "…"} ${san}`
}

export function ReplayGame({ gameId }: { gameId: string }) {
  const game = useLiveQuery(async () => (await db.games.get(gameId)) ?? null, [gameId])
  if (game === undefined) return <ReviewSkeleton />
  if (game === null) {
    return (
      <p className="border-t border-border rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        This game isn&apos;t in this browser&apos;s library.{" "}
        <Link href="/" className="text-primary underline underline-offset-4 hover:decoration-2">
          Import games
        </Link>
      </p>
    )
  }
  return <Replay key={game.id} game={game} />
}

type Session = { startPly: number; strength: Strength; moves: string[]; resigned: boolean }

/**
 * Replays a game against Stockfish from a chosen position, by default the
 * one before the user's costliest move. A #ply=N link (from the review's
 * "Play from here") picks the start instead.
 */
function Replay({ game }: { game: Game }) {
  const positions = useMemo(() => replayMoves(game.moves), [game.moves])
  const evals = useGameEvals(game.id, positions)
  const assessments = useMemo(
    () => (evals ? assessMoves(positions, evals) : positions.map(() => null)),
    [positions, evals],
  )
  const critical = criticalPly(assessments, game.userColor)
  // Replay only renders in the browser after the game loads, so window is safe
  const [chosenPly, setChosenPly] = useState<number | null>(() => {
    const fromHash = Number(window.location.hash.match(/ply=(\d+)/)?.[1])
    return Number.isInteger(fromHash) ? Math.min(fromHash, positions.length - 1) : null
  })
  const [strengthId, setStrengthId] = useState("1700")
  const [session, setSession] = useState<Session | null>(null)

  const startPly = chosenPly ?? critical ?? 0
  const opponent = game.userColor === "white" ? game.black : game.white
  const [platform, sourceId] = game.id.split(":")

  if (session) {
    return (
      <Match
        game={game}
        startFen={positions[session.startPly].fen}
        session={session}
        onChange={setSession}
        onRestart={() => setSession({ ...session, moves: [], resigned: false })}
        onSetup={() => setSession(null)}
      />
    )
  }

  // The move the user actually played from the start position, if it was theirs
  const played = positions[startPly + 1]?.lastMove
  const playedAssessment = assessments[startPly + 1]
  const userToMove = (startPly % 2 === 0) === (game.userColor === "white")

  return (
    <div className="flex flex-col gap-6">
      <Header game={game} opponentName={opponent.name} platform={platform} sourceId={sourceId} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-2">
          <ReviewBoard position={positions[startPly]} orientation={game.userColor} />
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="icon-lg" onClick={() => setChosenPly(Math.max(0, startPly - 1))} disabled={startPly === 0} aria-label="Start one move earlier">
              <ChevronLeft />
            </Button>
            <span className="text-center font-mono text-foreground tabular-nums">{startLabel(startPly, positions[startPly].lastMove?.san)}</span>
            <Button variant="outline" size="icon-lg" onClick={() => setChosenPly(Math.min(positions.length - 2, startPly + 1))} disabled={startPly >= positions.length - 2} aria-label="Start one move later">
              <ChevronRight />
            </Button>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 border-t border-border rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1">
            <h2 className="section-title">
              {startPly === critical && chosenPly === null ? "Replay from the turning point" : "Replay from here"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {played && userToMove && playedAssessment ? (
                <>
                  In the game you played{" "}
                  <span className={`font-mono ${playedAssessment.judgement ? JUDGEMENT_TEXT[playedAssessment.judgement] : "text-foreground"}`}>
                    {played.san}
                    {playedAssessment.judgement && JUDGEMENT_GLYPHS[playedAssessment.judgement]}
                  </span>{" "}
                  here, and your win chance went from {Math.round(playedAssessment.winBefore)}% to{" "}
                  {Math.round(playedAssessment.winAfter)}%. Try to do better.
                </>
              ) : evals === undefined || evals.some((e) => !e) ? (
                "Analyzing the game to find its turning point…"
              ) : (
                "Play the position out against Stockfish."
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">Opponent strength</span>
            <ToggleGroup
              value={[strengthId]}
              onValueChange={(value) => value[0] && setStrengthId(value[0])}
              variant="outline"
              size="sm"
              className="flex-wrap"
              aria-label="Opponent strength"
            >
              {STRENGTHS.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id}>
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Ratings are approximate: Stockfish&apos;s limits are calibrated for longer games.
            </p>
          </div>

          <Button
            size="lg"
            className="w-fit"
            onClick={() =>
              setSession({ startPly, strength: STRENGTHS.find((s) => s.id === strengthId)!, moves: [], resigned: false })
            }
          >
            <Play aria-hidden /> Start playing as {game.userColor}
          </Button>
        </aside>
      </div>
    </div>
  )
}

function Header({ game, opponentName, platform, sourceId }: { game: Game; opponentName: string; platform: string; sourceId: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4">
      <Link href={`/review/${platform}/${sourceId}`} className="flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        <ArrowLeft className="size-4" aria-hidden /> Back to the review
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="page-title min-w-0 break-words">Replay vs {opponentName}</h1>
        <span className="text-sm text-muted-foreground">
          {formatOutcome(game)} · {new Date(game.playedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </span>
      </div>
    </header>
  )
}

const OUTCOME_TITLE = { win: "You won!", draw: "Draw", loss: "Stockfish won" } as const

/** The game itself: user against the limited-strength engine. */
function Match({
  game,
  startFen,
  session,
  onChange,
  onRestart,
  onSetup,
}: {
  game: Game
  startFen: string
  session: Session
  onChange: (session: Session) => void
  onRestart: () => void
  onSetup: () => void
}) {
  const opponent = useRef<Opponent | null>(null)
  const [ready, setReady] = useState(false)

  // One opponent engine per match, configured once and shut down on leave
  useEffect(() => {
    const engine = new Opponent()
    opponent.current = engine
    void engine.configure(session.strength).then(() => setReady(true))
    return () => {
      engine.dispose()
      opponent.current = null
    }
  }, [session.strength])

  const fen = useMemo(() => {
    const chess = new Chess(startFen)
    for (const uci of session.moves) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return chess.fen()
  }, [startFen, session.moves])

  const outcome: ReplayOutcome | null = session.resigned
    ? { result: "loss", reason: "resignation" }
    : replayOutcome(startFen, session.moves, game.userColor)
  const userToMove = (fen.split(" ")[1] === "w") === (game.userColor === "white")
  const thinking = !outcome && !userToMove

  // When it's Stockfish's turn, ask for its move. The result is applied from
  // the promise, and dropped if the position changed (take-back) meanwhile.
  useEffect(() => {
    if (!thinking || !ready || !opponent.current) return
    let cancelled = false
    const started = Date.now()
    void opponent.current.move(fen, session.strength).then((uci) => {
      if (cancelled || !uci) return
      const wait = Math.max(0, MIN_REPLY_MS - (Date.now() - started))
      setTimeout(() => {
        if (!cancelled) onChange({ ...session, moves: [...session.moves, uci] })
      }, wait)
    })
    return () => {
      cancelled = true
    }
  }, [thinking, ready, fen, session, onChange])

  const takeBack = () => {
    // Back to the user's previous turn: drop the engine's reply and the user's move
    const moves = session.moves.slice(0, userToMove ? -2 : -1)
    onChange({ ...session, moves })
  }

  const last = session.moves.at(-1)
  const sans = useMemo(() => {
    const chess = new Chess(startFen)
    return session.moves.map((uci) => chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san)
  }, [startFen, session.moves])
  const [platform, sourceId] = game.id.split(":")
  const opponentName = game.userColor === "white" ? game.black.name : game.white.name

  return (
    <div className="flex flex-col gap-6">
      <Header game={game} opponentName={opponentName} platform={platform} sourceId={sourceId} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
        <InteractiveBoard
          id="replay-board"
          fen={fen}
          color={game.userColor}
          canMove={!outcome && userToMove && ready}
          onMove={(uci) => {
            onChange({ ...session, moves: [...session.moves, uci] })
            return true
          }}
          lastMove={last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : null}
        />

        <aside className="flex min-w-0 flex-col gap-4 border-t border-border rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-3xl" role="status">
              {outcome ? (
                <span className={outcome.result === "win" ? "text-best" : outcome.result === "loss" ? "text-blunder" : ""}>
                  {OUTCOME_TITLE[outcome.result]}
                </span>
              ) : !ready ? (
                <span className="text-muted-foreground">Starting Stockfish…</span>
              ) : thinking ? (
                <span className="text-muted-foreground">Stockfish is thinking…</span>
              ) : (
                "Your move"
              )}
            </p>
            <span className="shrink-0 text-right text-xs font-semibold text-muted-foreground">
              vs Stockfish {session.strength.label}
            </span>
          </div>
          {outcome && <p className="-mt-2 text-sm text-muted-foreground">By {outcome.reason}. In the real game: {formatOutcome(game).toLowerCase()}.</p>}

          <p className="min-h-10 border-t border-border pt-3 font-mono text-sm text-foreground tabular-nums">
            {sans.length ? numberMoves(startFen, sans).join(" ") : "No moves yet"}
          </p>

          <div className="flex flex-wrap gap-2">
            {!outcome && (
              <>
                <Button variant="outline" onClick={takeBack} disabled={thinking || session.moves.length < (userToMove ? 2 : 1)}>
                  <Undo2 aria-hidden /> Take back
                </Button>
                <Button variant="ghost" onClick={() => onChange({ ...session, resigned: true })} disabled={!session.moves.length}>
                  <Flag aria-hidden /> Resign
                </Button>
              </>
            )}
            {outcome && (
              <Button onClick={onRestart}>
                <RotateCcw aria-hidden /> Play again
              </Button>
            )}
            <Button variant="ghost" onClick={onSetup}>
              Change start or strength
            </Button>
          </div>

          {outcome && session.moves.length > 0 && (
            <ReplayAnalysis key={session.moves.join(" ")} startFen={startFen} moves={session.moves} userColor={game.userColor} />
          )}
        </aside>
      </div>
    </div>
  )
}
