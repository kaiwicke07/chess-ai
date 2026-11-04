"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { ArrowLeft, Check, Eye, Flag, Lightbulb, LoaderCircle, RotateCcw, Undo2 } from "lucide-react"
import type { Arrow } from "react-chessboard"

import { BotAvatar } from "@/components/bots/BotAvatar"
import { InteractiveBoard } from "@/components/board/InteractiveBoard"
import { ReplayAnalysis } from "@/components/replay/ReplayAnalysis"
import { BEST_COLOR, JUDGEMENT_COLORS, JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS } from "@/lib/analysis/classify"
import type { Bot } from "@/lib/bots/bots"
import { coachMove, type CoachLevel, type CoachVerdict } from "@/lib/bots/coach"
import { BotPlayer } from "@/lib/bots/player"
import { numberMoves } from "@/lib/chess/san"
import { analysisQueue } from "@/lib/engine/queue"
import { replayOutcome, type ReplayOutcome } from "@/lib/replay/outcome"
import { playSound } from "@/lib/sound"
import type { Color, PositionEval } from "@/lib/types"
import { useHotkeys } from "@/lib/useHotkeys"

const START_FEN = new Chess().fen()

/** The bot never answers faster than this, so its move doesn't land on top of yours. */
const MIN_REPLY_MS = 500

/** What the coach is doing with the user's latest move. */
type Pending = "checking" | "coaching" | null

const play = (fen: string, uci: string) => {
  const chess = new Chess(fen)
  chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return chess.fen()
}

const toArrow = (uci: string, color: string): Arrow => ({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color })

/**
 * A game against one bot, optionally coached. With the coach on, each of
 * your moves is evaluated (depth 14, cached like any other analysis) and
 * judged by the review's rules. A move bad enough for the chosen level
 * pauses the game: the coach explains it from the engine's line and you can
 * try again, see the best move, or keep your move and play on.
 */
export function BotGame({
  bot,
  userColor,
  coach,
  onRematch,
  onExit,
}: {
  bot: Bot
  userColor: Color
  coach: CoachLevel
  onRematch: () => void
  onExit: () => void
}) {
  const [moves, setMoves] = useState<string[]>([])
  const [resigned, setResigned] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [verdict, setVerdict] = useState<CoachVerdict | null>(null)
  // Set after the coach stops a move: the next move is a second try
  const [retrying, setRetrying] = useState(false)
  const [fixed, setFixed] = useState(false)
  const [arrowBest, setArrowBest] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [stats, setStats] = useState({ stops: 0, fixed: 0, kept: 0, helped: 0 })
  const [ready, setReady] = useState(false)
  const [engineError, setEngineError] = useState(false)

  const player = useRef<BotPlayer | null>(null)
  // Bumped on every take-back, retry and restart, so late engine answers for
  // a position that's no longer on the board are dropped
  const generation = useRef(0)
  // Evals the coach has asked for, by FEN, so a position is never searched twice
  const evals = useRef(new Map<string, Promise<PositionEval>>())

  const evalOf = (fen: string): Promise<PositionEval> => {
    let result = evals.current.get(fen)
    if (!result) {
      result = analysisQueue ? analysisQueue.evaluate(fen) : Promise.reject(new Error("No engine"))
      evals.current.set(fen, result)
      // A failed search shouldn't stay cached
      result.catch(() => evals.current.delete(fen))
    }
    return result
  }

  // One engine per game, configured once and shut down on leave
  useEffect(() => {
    const engine = new BotPlayer(bot)
    player.current = engine
    engine.configure().then(
      () => setReady(true),
      () => setEngineError(true),
    )
    return () => {
      engine.dispose()
      player.current = null
    }
  }, [bot])

  const fen = useMemo(() => moves.reduce(play, START_FEN), [moves])
  const sans = useMemo(() => {
    const chess = new Chess()
    return moves.map((uci) => chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san)
  }, [moves])
  const outcome: ReplayOutcome | null = resigned
    ? { result: "loss", reason: "resignation" }
    : replayOutcome(START_FEN, moves, userColor)
  const over = !!outcome
  const userTurn = (fen.split(" ")[1] === "w") === (userColor === "white")
  const botThinking = ready && !over && !userTurn && !pending

  // While it's your turn, the coach looks at the position in the background,
  // so judging your move only needs the position after it
  useEffect(() => {
    if (coach !== "off" && userTurn && !over) void evalOf(fen).catch(() => {})
  })

  // The bot's turn: ask its engine, then play the move after a short pause
  useEffect(() => {
    if (!botThinking || !player.current) return
    let cancelled = false
    const started = Date.now()
    player.current.move(fen).then(
      (uci) => {
        if (cancelled || !uci) return
        setTimeout(
          () => {
            if (!cancelled) setMoves((m) => [...m, uci])
          },
          Math.max(0, MIN_REPLY_MS - (Date.now() - started)),
        )
      },
      () => setEngineError(true),
    )
    return () => {
      cancelled = true
    }
  }, [botThinking, fen])

  // A finished game gets the closing sound (checkmate already has its own)
  const endReason = outcome?.reason
  useEffect(() => {
    if (endReason && endReason !== "checkmate") playSound("end")
  }, [endReason])

  function handleMove(uci: string): boolean {
    if (!userTurn || pending || over) return false
    const before = fen
    const after = play(fen, uci)
    const ply = moves.length
    setMoves((m) => [...m, uci])
    setHint(null)
    setArrowBest(false)
    setFixed(false)
    if (coach === "off") return true

    setPending("checking")
    const gen = generation.current
    const wasRetry = retrying
    Promise.all([evalOf(before), evalOf(after)]).then(
      ([beforeEval, afterEval]) => {
        if (gen !== generation.current) return
        const result = coachMove({ fen: before, uci, before: beforeEval, after: afterEval, color: userColor, ply: ply + 1, level: coach })
        setVerdict(result)
        setRetrying(false)
        if (result.stop) {
          setPending("coaching")
          setStats((s) => ({ ...s, stops: s.stops + 1 }))
          playSound("wrong")
        } else {
          setPending(null)
          if (wasRetry) {
            setFixed(true)
            setStats((s) => ({ ...s, fixed: s.fixed + 1 }))
            setTimeout(() => playSound("correct"), 150)
          }
        }
      },
      () => {
        // The analysis engine failed: carry on without the coach
        if (gen !== generation.current) return
        setPending(null)
        setEngineError(true)
      },
    )
    return true
  }

  /** Takes the stopped move back so you can look for a better one. */
  function tryAgain(showBest = false) {
    generation.current++
    setMoves((m) => m.slice(0, -1))
    setPending(null)
    setRetrying(true)
    setArrowBest(showBest)
    if (showBest) setStats((s) => ({ ...s, helped: s.helped + 1 }))
  }

  function keepMove() {
    setPending(null)
    setVerdict(null)
    setStats((s) => ({ ...s, kept: s.kept + 1 }))
  }

  function takeBack() {
    generation.current++
    // Back to your previous turn: the bot's reply and your move
    setMoves((m) => m.slice(0, userTurn ? -2 : -1))
    setPending(null)
    setVerdict(null)
    setRetrying(false)
    setHint(null)
    setArrowBest(false)
  }

  function askHint() {
    const gen = generation.current
    void evalOf(fen).then((e) => {
      if (gen === generation.current && e.best) setHint(e.best.slice(0, 2))
    })
    setStats((s) => ({ ...s, helped: s.helped + 1 }))
  }

  const coaching = pending === "coaching" && verdict
  const canTakeBack = userTurn && !pending && !over && moves.length >= 2
  const canHint = coach !== "off" && userTurn && !pending && !over && !hint
  useHotkeys({
    r: coaching ? () => tryAgain() : null,
    k: coaching ? keepMove : null,
    h: canHint ? askHint : null,
  })

  // Arrows: on a stopped move, its refutation; on a retry with help, the best move
  const arrows: Arrow[] = []
  if (coaching && verdict.refutation) arrows.push(toArrow(verdict.refutation.uci, JUDGEMENT_COLORS[verdict.assessment.judgement!]))
  if (arrowBest && retrying && verdict?.best) arrows.push(toArrow(verdict.best.uci, BEST_COLOR))

  const last = moves.at(-1)
  const botColor: Color = userColor === "white" ? "black" : "white"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          type="button"
          onClick={onExit}
          className="flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> Choose another bot
        </button>
        <h1 className="page-title">Playing {bot.name}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <BotAvatar bot={bot} size="sm" />
            <span className={`size-3 shrink-0 rounded-full ring-1 ring-foreground/30 ${botColor === "white" ? "bg-neutral-100" : "bg-neutral-900"}`} aria-hidden />
            <span className="font-semibold">{bot.name}</span>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">~{bot.rating}</span>
            {botThinking && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> thinking
              </span>
            )}
          </div>
          <InteractiveBoard
            id="bot-board"
            fen={fen}
            color={userColor}
            canMove={ready && userTurn && !pending && !over}
            onMove={handleMove}
            lastMove={last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : null}
            hintSquare={hint}
            arrows={arrows}
          />
          <div className="flex items-center gap-2.5">
            <span className={`size-3 shrink-0 rounded-full ring-1 ring-foreground/30 ${userColor === "white" ? "bg-neutral-100" : "bg-neutral-900"}`} aria-hidden />
            <span className="font-semibold">You</span>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          {over ? (
            <GameOver outcome={outcome} bot={bot} />
          ) : coach === "off" ? (
            <p className="font-display text-3xl" role="status">
              {!ready ? <span className="text-muted-foreground">Setting up…</span> : userTurn ? "Your move" : <span className="text-muted-foreground">{bot.name} is thinking…</span>}
            </p>
          ) : (
            <CoachPanel
              ready={ready}
              pending={pending}
              verdict={verdict}
              retrying={retrying}
              fixed={fixed}
              userTurn={userTurn}
              botName={bot.name}
              arrowBest={arrowBest}
              onTryAgain={() => tryAgain()}
              onShowBest={() => tryAgain(true)}
              onKeep={keepMove}
            />
          )}

          {engineError && (
            <p className="text-sm text-blunder" role="alert">
              The engine stopped responding. Reload the page to start over.
            </p>
          )}

          <p className="min-h-10 border-t border-border pt-3 font-mono text-sm tabular-nums">
            {sans.length ? numberMoves(START_FEN, sans).join(" ") : <span className="text-muted-foreground">No moves yet</span>}
          </p>

          <div className="flex flex-wrap gap-2">
            {!over && (
              <>
                {coach !== "off" && (
                  <Button variant="outline" onClick={askHint} disabled={!canHint} aria-keyshortcuts="H">
                    <Lightbulb aria-hidden /> Hint <Kbd>H</Kbd>
                  </Button>
                )}
                <Button variant="outline" onClick={takeBack} disabled={!canTakeBack}>
                  <Undo2 aria-hidden /> Take back
                </Button>
                <Button variant="ghost" onClick={() => setResigned(true)} disabled={!moves.length || !!pending}>
                  <Flag aria-hidden /> Resign
                </Button>
              </>
            )}
            {over && (
              <>
                <Button onClick={onRematch}>
                  <RotateCcw aria-hidden /> Rematch
                </Button>
                <Button variant="outline" onClick={onExit}>
                  New opponent
                </Button>
              </>
            )}
          </div>

          {over && coach !== "off" && (
            <p className="text-sm text-muted-foreground">
              {stats.stops === 0
                ? "The coach never had to stop you."
                : `The coach stopped you ${stats.stops === 1 ? "once" : `${stats.stops} times`}; you found a better move ${stats.fixed === 1 ? "once" : `${stats.fixed} times`}${stats.kept ? ` and kept your move ${stats.kept === 1 ? "once" : `${stats.kept} times`}` : ""}.`}
            </p>
          )}
          {over && moves.length > 0 && <ReplayAnalysis key={moves.join(" ")} startFen={START_FEN} moves={moves} userColor={userColor} />}
        </aside>
      </div>
    </div>
  )
}

const OUTCOME_TITLE = { win: "You won!", draw: "Draw" } as const

function GameOver({ outcome, bot }: { outcome: ReplayOutcome; bot: Bot }) {
  return (
    <div className="flex flex-col gap-1" role="status">
      <p className={`font-display text-3xl ${outcome.result === "win" ? "text-best" : outcome.result === "loss" ? "text-blunder" : ""}`}>
        {outcome.result === "loss" ? `${bot.name} won` : OUTCOME_TITLE[outcome.result]}
      </p>
      <p className="text-sm text-muted-foreground">By {outcome.reason}.</p>
    </div>
  )
}

/** The coach's side of the panel: waiting, a stopped move, a retry, or a quick note. */
function CoachPanel({
  ready,
  pending,
  verdict,
  retrying,
  fixed,
  userTurn,
  botName,
  arrowBest,
  onTryAgain,
  onShowBest,
  onKeep,
}: {
  ready: boolean
  pending: Pending
  verdict: CoachVerdict | null
  retrying: boolean
  fixed: boolean
  userTurn: boolean
  botName: string
  arrowBest: boolean
  onTryAgain: () => void
  onShowBest: () => void
  onKeep: () => void
}) {
  if (!ready) return <p className="font-display text-3xl text-muted-foreground">Setting up…</p>

  if (pending === "checking") {
    return (
      <p className="flex items-center gap-2 font-display text-3xl text-muted-foreground" role="status">
        <LoaderCircle className="size-6 shrink-0 animate-spin" aria-hidden /> Coach is checking…
      </p>
    )
  }

  const judgement = verdict?.assessment.judgement
  const moveLabel = verdict && (
    <span className="font-mono">
      {verdict.san}
      {judgement && JUDGEMENT_GLYPHS[judgement]}
    </span>
  )

  if (pending === "coaching" && verdict && judgement) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div className="flex flex-col gap-2">
          <p className={`font-display text-3xl ${JUDGEMENT_TEXT[judgement]}`}>
            {JUDGEMENT_LABELS[judgement]}: {moveLabel}
          </p>
          {verdict.explanation && <p className="text-pretty">{verdict.explanation}</p>}
          <p className="text-sm text-muted-foreground">
            Your winning chances go from <span className="font-mono tabular-nums">{Math.round(verdict.assessment.winBefore)}%</span> to{" "}
            <span className="font-mono tabular-nums">{Math.round(verdict.assessment.winAfter)}%</span>
            {verdict.refutation && (
              <>
                . The arrow shows {botName}&apos;s best answer, <span className="font-mono">{verdict.refutation.san}</span>
              </>
            )}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onTryAgain} aria-keyshortcuts="R">
            <Undo2 aria-hidden /> Try again <Kbd>R</Kbd>
          </Button>
          <Button variant="outline" onClick={onShowBest}>
            <Eye aria-hidden /> Show best move
          </Button>
          <Button variant="ghost" onClick={onKeep} aria-keyshortcuts="K">
            Keep my move <Kbd>K</Kbd>
          </Button>
        </div>
      </div>
    )
  }

  if (retrying && verdict && userTurn) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="font-display text-3xl">Find a better move</p>
        <p className="text-sm text-muted-foreground">
          {arrowBest && verdict.best ? (
            <>
              Stockfish&apos;s choice is <span className="font-mono text-best">{verdict.best.san}</span>, shown by the green arrow. Try it on the board.
            </>
          ) : (
            <>
              Instead of {moveLabel}. {verdict.explanation}
            </>
          )}
        </p>
      </div>
    )
  }

  // A move that didn't stop the game: a short note on it, then the bot's turn
  let note: React.ReactNode = null
  if (fixed) note = <span className="flex items-center gap-1.5 text-best"><Check className="size-4" aria-hidden /> That&apos;s better!</span>
  else if (verdict?.assessment.best) note = <span className="flex items-center gap-1.5 text-best"><Check className="size-4" aria-hidden /> {verdict.san} was the best move.</span>
  else if (verdict && judgement)
    note = (
      <span>
        <span className={JUDGEMENT_TEXT[judgement]}>
          {JUDGEMENT_LABELS[judgement]}: {moveLabel}.
        </span>{" "}
        <span className="text-muted-foreground">{verdict.best && `Stockfish preferred ${verdict.best.san}.`}</span>
      </span>
    )
  else if (verdict) note = <span className="text-muted-foreground">{verdict.san} is a good move.</span>

  return (
    <div className="flex flex-col gap-2" role="status">
      <p className="font-display text-3xl">{userTurn ? "Your move" : <span className="text-muted-foreground">{botName} is thinking…</span>}</p>
      {note && <p className="text-sm">{note}</p>}
    </div>
  )
}
