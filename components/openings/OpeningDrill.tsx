"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { ArrowRight, CalendarClock, Eye, Lightbulb, LoaderCircle } from "lucide-react"
import type { Grade } from "ts-fsrs"

import { InteractiveBoard } from "@/components/board/InteractiveBoard"
import { Button } from "@/components/ui/button"
import { numberMoves } from "@/lib/chess/san"
import { analysisQueue } from "@/lib/engine/queue"
import type { WeakSpot } from "@/lib/openings/deviations"
import { knownVerdict, verdictFromEval } from "@/lib/openings/drill"
import { GRADE_LABELS } from "@/lib/srs/grading"
import { formatInterval } from "@/lib/srs/scheduler"
import type { SolveOutcome } from "@/lib/types"

const REPLAY_MS = 350

type Phase = "replay" | "playing" | "checking" | "done"

const OUTCOME_TEXT: Record<SolveOutcome, string> = {
  clean: "Good move!",
  hinted: "Good move, with a hint",
  retried: "Good move, after a retry",
  failed: "Here's Stockfish's move",
}

function play(fen: string, uci: string) {
  const chess = new Chess(fen)
  const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return { fen: chess.fen(), san: move.san }
}

/**
 * Drills one weak spot. Your usual line to the position plays itself, then
 * you find a move that's within a few percent of Stockfish's best. Known
 * moves are judged instantly; anything new gets a quick engine evaluation.
 * Key by spot id so a new drill starts fresh.
 */
export function OpeningDrill({
  spot,
  review,
  onFinished,
  onNext,
}: {
  spot: WeakSpot
  review: { due: number; grade: number; savedAt: number } | null
  onFinished: (outcome: SolveOutcome, durationMs: number) => void
  onNext: (() => void) | null
}) {
  const path = spot.node.path
  const [phase, setPhase] = useState<Phase>(path.length ? "replay" : "playing")
  const [replayed, setReplayed] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [wrong, setWrong] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null)
  // The move on the board while it's being checked, and after the drill ends
  const [shown, setShown] = useState<{ uci: string; fen: string; san: string } | null>(null)
  const startedAt = useRef(0)

  // Positions along your usual line, so the replay can step through them
  const lineFens = useMemo(() => {
    const fens = [new Chess().fen()]
    for (const uci of path) fens.push(play(fens.at(-1)!, uci).fen)
    return fens
  }, [path])

  // A weak spot on move one has nothing to replay: start the clock right away
  useEffect(() => {
    if (!path.length) startedAt.current = Date.now()
  }, [path.length])

  // Replay the line one move at a time, then start the clock
  useEffect(() => {
    if (phase !== "replay") return
    const timer = setTimeout(() => {
      if (replayed + 1 >= path.length) {
        setReplayed(path.length)
        setPhase("playing")
        startedAt.current = Date.now()
      } else {
        setReplayed(replayed + 1)
      }
    }, REPLAY_MS)
    return () => clearTimeout(timer)
  }, [phase, replayed, path.length])

  function finish(result: SolveOutcome) {
    setOutcome(result)
    setPhase("done")
    onFinished(result, Date.now() - startedAt.current)
  }

  function judged(uci: string, good: boolean, after: { fen: string; san: string }) {
    if (good) {
      setShown({ uci, ...after })
      finish(mistakes ? "retried" : hintUsed ? "hinted" : "clean")
    } else {
      setShown(null)
      setMistakes((m) => m + 1)
      setWrong(after.san)
      setPhase("playing")
    }
  }

  function handleMove(uci: string): boolean {
    if (phase !== "playing") return false
    const after = play(spot.node.fen, uci)
    const verdict = knownVerdict(spot, uci)
    if (verdict !== "unknown") {
      judged(uci, verdict === "good", after)
      return verdict === "good"
    }
    // New to us: keep the piece where it landed while the engine takes a look
    setShown({ uci, ...after })
    setPhase("checking")
    setWrong(null)
    void analysisQueue
      ?.evaluate(after.fen)
      .then((evaluation) => judged(uci, verdictFromEval(spot, evaluation.eval) === "good", after))
      .catch(() => {
        setShown(null)
        setPhase("playing")
      })
    return true
  }

  function showAnswer() {
    setShown({ uci: spot.best.uci, ...play(spot.node.fen, spot.best.uci) })
    finish("failed")
  }

  const fen = shown ? shown.fen : phase === "replay" ? lineFens[replayed] : spot.node.fen
  const lastUci = shown?.uci ?? (phase === "replay" ? path[replayed - 1] : path.at(-1))
  const lastMove = lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null
  const colorName = spot.color === "white" ? "White" : "Black"
  const usual = spot.badMoves[0]

  let prompt: React.ReactNode
  if (outcome) prompt = <span className={outcome === "failed" ? "" : "text-best"}>{OUTCOME_TEXT[outcome]}</span>
  else if (phase === "replay") prompt = <span className="text-muted-foreground">Replaying your usual line…</span>
  else if (phase === "checking")
    prompt = (
      <span className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Checking {shown?.san}…
      </span>
    )
  else if (wrong) prompt = <span className="text-blunder">{wrong} isn&apos;t good enough here. Try again.</span>
  else prompt = <>Find a good move for {colorName}</>

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
      <InteractiveBoard
        id="opening-board"
        fen={fen}
        color={spot.color}
        canMove={phase === "playing"}
        onMove={handleMove}
        lastMove={lastMove}
        hintSquare={hintUsed ? spot.best.uci.slice(0, 2) : null}
      />

      <aside className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-sm text-muted-foreground">{numberMoves(new Chess().fen(), spot.pathSan).join(" ") || "Starting position"}</p>
          <p className="text-lg font-semibold" role="status">
            {prompt}
          </p>
        </div>

        {!outcome && phase !== "replay" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setHintUsed(true)} disabled={hintUsed || phase !== "playing"}>
              <Lightbulb aria-hidden /> Hint
            </Button>
            <Button variant="ghost" onClick={showAnswer} disabled={phase === "checking"}>
              <Eye aria-hidden /> Show answer
            </Button>
          </div>
        )}

        {outcome && (
          <div className="flex flex-col gap-3 text-sm">
            {review && (
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" aria-hidden />
                <span>
                  Graded <span className="font-medium">{GRADE_LABELS[review.grade as Grade]}</span> · next drill in{" "}
                  {formatInterval(review.due, review.savedAt)}
                </span>
              </p>
            )}
            {usual && (
              <p className="text-muted-foreground">
                In your games you played <span className="font-mono text-mistake">{usual.san}</span> here{" "}
                {usual.count} of {spot.node.games} times, giving up about {Math.round(usual.loss)}% win chance.
              </p>
            )}
            <p>
              Stockfish&apos;s main line: <span className="font-mono">{spot.line.join(" ")}</span>
            </p>
            {onNext && (
              <Button className="w-fit" onClick={onNext}>
                Next drill <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
