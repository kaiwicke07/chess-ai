"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Chess, type Square } from "chess.js"
import { Chessboard } from "react-chessboard"
import { ArrowRight, Eye, Lightbulb } from "lucide-react"

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
import type { Game, Puzzle } from "@/lib/types"

const HIGHLIGHT = { backgroundColor: "color-mix(in oklch, var(--primary) 35%, transparent)" }
const SELECTED = { backgroundColor: "color-mix(in oklch, var(--primary) 55%, transparent)" }
const HINT = { boxShadow: "inset 0 0 0 4px var(--best)" }

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
  onFinished,
  onNext,
}: {
  puzzle: Puzzle
  game: Game | undefined
  onFinished: (outcome: SolveOutcome) => void
  onNext: (() => void) | null
}) {
  const [state, setState] = useState<SolveState>(START)
  const [selected, setSelected] = useState<string | null>(null)
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

  function tryMove(from: string, to: string): boolean {
    if (!userToMove) return false
    const chess = new Chess(fen)
    const piece = chess.get(from as Square)
    if (!piece || piece.color !== (puzzle.color === "white" ? "w" : "b")) return false
    if (!chess.moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) return false

    const promotion = piece.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : ""
    const result = userMove(state, puzzle, from + to + promotion)
    setState(result.state)
    setSelected(null)
    if (!result.played) {
      setWrong(true)
      return false
    }
    setWrong(false)
    if (result.played !== puzzle.solution[state.step]) {
      chess.move({ from, to, promotion: promotion || undefined })
      setFinalFen(chess.fen())
    }
    const finished = outcomeOf(result.state)
    if (finished) onFinished(finished)
    return true
  }

  function onSquareClick(square: string) {
    if (selected && tryMove(selected, square)) return
    const piece = new Chess(fen).get(square as Square)
    const own = piece && piece.color === (puzzle.color === "white" ? "w" : "b")
    setSelected(own && userToMove ? square : null)
  }

  function showSolution() {
    const failed: SolveState = { ...state, status: "failed" }
    setState(failed)
    setWrong(false)
    onFinished("failed")
  }

  // Highlights: last move, selected piece, and the hint square
  const last =
    state.step > 0 && !finalFen
      ? { from: puzzle.solution[state.step - 1].slice(0, 2), to: puzzle.solution[state.step - 1].slice(2, 4) }
      : !finalFen
        ? puzzle.previousMove
        : null
  const squareStyles: Record<string, React.CSSProperties> = {}
  if (last) squareStyles[last.from] = squareStyles[last.to] = HIGHLIGHT
  if (selected) squareStyles[selected] = SELECTED
  if (state.hintUsed && userToMove) squareStyles[puzzle.solution[state.step].slice(0, 2)] = HINT

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
      <div className="overflow-hidden rounded-lg">
        <Chessboard
          options={{
            id: "puzzle-board",
            position: fen,
            boardOrientation: puzzle.color,
            allowDragging: userToMove,
            canDragPiece: ({ piece }) => piece.pieceType[0] === (puzzle.color === "white" ? "w" : "b"),
            onPieceDrop: ({ sourceSquare, targetSquare }) => !!targetSquare && tryMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => onSquareClick(square),
            animationDurationInMs: 200,
            squareStyles,
            darkSquareStyle: { backgroundColor: "var(--board-dark)" },
            lightSquareStyle: { backgroundColor: "var(--board-light)" },
            darkSquareNotationStyle: { color: "var(--board-light)" },
            lightSquareNotationStyle: { color: "var(--board-dark)" },
          }}
        />
      </div>

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
