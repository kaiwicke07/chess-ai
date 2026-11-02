"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Chess } from "chess.js"
import { ArrowRight, CalendarClock, Eye, Lightbulb } from "lucide-react"
import type { Grade } from "ts-fsrs"

import { InteractiveBoard } from "@/components/board/InteractiveBoard"
import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS } from "@/lib/analysis/classify"
import {
  advance,
  awaitingReply,
  fenAt,
  outcomeOf,
  START,
  userMove,
  type SolveOutcome,
  type SolveState,
} from "@/lib/puzzles/solve"
import { THEME_LABELS } from "@/lib/puzzles/themes"
import { GRADE_LABELS } from "@/lib/srs/grading"
import { formatInterval } from "@/lib/srs/scheduler"
import type { Game, Puzzle } from "@/lib/types"

const OUTCOME_TEXT: Record<SolveOutcome, string> = {
  clean: "Solved!",
  hinted: "Solved with a hint",
  retried: "Solved after a retry",
  failed: "Here's the solution",
}

/** Delay before the opponent's reply, so the user sees their own move land. */
const REPLY_DELAY_MS = 450

/**
 * One puzzle on an interactive board. Drag a piece or click it and then its
 * target. Correct moves stay; the opponent's reply follows automatically.
 * Wrong moves snap back and can be retried. Key this component by puzzle id
 * so a new puzzle starts fresh.
 */
export function PuzzleSolver({
  puzzle,
  game,
  review,
  onFinished,
  onNext,
}: {
  puzzle: Puzzle
  game: Game | undefined
  /** The schedule this attempt produced, once it's saved */
  review: { due: number; grade: number; savedAt: number } | null
  onFinished: (outcome: SolveOutcome, durationMs: number) => void
  onNext: (() => void) | null
}) {
  const [state, setState] = useState<SolveState>(START)
  // Attempt timer for grading; starts when the puzzle appears
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  const elapsed = () => Date.now() - startedAt.current
  const [wrong, setWrong] = useState(false)
  // A mating move other than the stored one ends the puzzle on its own position
  const [finalFen, setFinalFen] = useState<string | null>(null)

  const fen = useMemo(() => finalFen ?? fenAt(puzzle, state.step), [finalFen, puzzle, state.step])
  const outcome = outcomeOf(state)
  const replyPending = awaitingReply(state, puzzle)
  const userToMove = state.status === "playing" && !replyPending

  // The opponent replies after each correct move; after "show solution" the
  // remaining moves play one by one. Both only set state from the timer.
  useEffect(() => {
    const revealing = state.status === "failed" && state.step < puzzle.solution.length
    if (!replyPending && !revealing) return
    const timer = setTimeout(() => setState((s) => advance(s)), revealing ? 700 : REPLY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [replyPending, state.status, state.step, puzzle.solution.length])

  // The board only passes on legal moves for the user's side
  function handleMove(uci: string): boolean {
    const result = userMove(state, puzzle, uci)
    setState(result.state)
    if (!result.played) {
      setWrong(true)
      return false
    }
    setWrong(false)
    if (result.played !== puzzle.solution[state.step]) {
      const chess = new Chess(fen)
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      setFinalFen(chess.fen())
    }
    const finished = outcomeOf(result.state)
    if (finished) onFinished(finished, elapsed())
    return true
  }

  function showSolution() {
    const failed: SolveState = { ...state, status: "failed" }
    setState(failed)
    setWrong(false)
    onFinished("failed", elapsed())
  }

  // The move that led to the shown position: the opponent's game move at first
  const last =
    state.step > 0 && !finalFen
      ? { from: puzzle.solution[state.step - 1].slice(0, 2), to: puzzle.solution[state.step - 1].slice(2, 4) }
      : !finalFen
        ? puzzle.previousMove
        : null

  const colorName = puzzle.color === "white" ? "White" : "Black"
  const opponent = game && (game.userColor === "white" ? game.black : game.white)
  const [platform, sourceId] = puzzle.gameId.split(":")

  let prompt: React.ReactNode
  if (outcome) prompt = <span className={outcome === "failed" ? "" : "text-best"}>{OUTCOME_TEXT[outcome]}</span>
  else if (wrong) prompt = <span className="text-blunder">Not the move. Try again.</span>
  else if (state.step > 0) prompt = <span className="text-best">Correct, keep going…</span>
  else prompt = <>Find the best move for {colorName}</>

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
      <InteractiveBoard
        id="puzzle-board"
        fen={fen}
        color={puzzle.color}
        canMove={userToMove}
        onMove={handleMove}
        lastMove={last}
        hintSquare={state.hintUsed && userToMove ? puzzle.solution[state.step].slice(0, 2) : null}
      />

      <aside className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2">
          <span
            className={`size-3.5 shrink-0 rounded-sm ${puzzle.color === "white" ? "bg-white" : "bg-neutral-950 ring-1 ring-neutral-300"}`}
            aria-hidden
          />
          <p className="text-lg font-semibold" role="status">
            {prompt}
          </p>
        </div>

        {!outcome && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setState((s) => ({ ...s, hintUsed: true }))}
              disabled={state.hintUsed || !userToMove}
            >
              <Lightbulb aria-hidden /> Hint
            </Button>
            <Button variant="ghost" onClick={showSolution}>
              <Eye aria-hidden /> Show solution
            </Button>
          </div>
        )}
        {state.hintUsed && userToMove && (
          <p className="text-sm text-muted-foreground">The highlighted piece is the one to move.</p>
        )}

        {outcome && (
          <div className="flex flex-col gap-3 text-sm">
            {review && (
              <p className="flex items-center gap-2" role="status">
                <CalendarClock className="size-4 text-primary" aria-hidden />
                <span>
                  Graded <span className="font-medium">{GRADE_LABELS[review.grade as Grade]}</span> · next review in{" "}
                  {/* The moment it was saved is "now" enough for a relative time */}
                  {formatInterval(review.due, review.savedAt)}
                </span>
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {puzzle.themes.map((theme) => (
                <Badge key={theme} variant="secondary">
                  {theme === "mate" && puzzle.mateIn ? `Mate in ${puzzle.mateIn}` : THEME_LABELS[theme]}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground">
              {opponent && game ? (
                <>
                  From your game vs {opponent.name} on{" "}
                  {new Date(game.playedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.{" "}
                </>
              ) : null}
              You played{" "}
              <span className={`font-mono ${JUDGEMENT_TEXT[puzzle.played.judgement]}`}>
                {puzzle.played.san}
                {JUDGEMENT_GLYPHS[puzzle.played.judgement]}
              </span>
              , a {JUDGEMENT_LABELS[puzzle.played.judgement].toLowerCase()}.
            </p>
            <div className="flex flex-wrap gap-2">
              {onNext && (
                <Button onClick={onNext}>
                  Next puzzle <ArrowRight aria-hidden />
                </Button>
              )}
              <Link
                href={`/review/${platform}/${sourceId}#ply=${puzzle.ply}`}
                className={buttonVariants({ variant: "outline" })}
              >
                View in game
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
