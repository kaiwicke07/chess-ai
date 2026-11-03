import Link from "next/link"
import { Puzzle } from "lucide-react"

import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS, type MoveAssessment } from "@/lib/analysis/classify"

/**
 * Verdict on the move that led to the shown position, with the explanation,
 * and a link to practice it when the position became a puzzle.
 */
export function MoveFeedback({
  san,
  assessment,
  explanation,
  puzzleId,
}: {
  san: string
  assessment: MoveAssessment
  explanation: string | null
  puzzleId: string | null
}) {
  const { judgement } = assessment
  const winDrop = Math.round(assessment.winBefore - assessment.winAfter)

  if (!judgement) {
    if (!assessment.best) return null
    return (
      <div className="border-b px-4 py-3 text-sm">
        <span className="font-semibold text-best">
          <span className="font-mono">{san}</span> is the best move
        </span>
        <span className="text-muted-foreground"> · Stockfish&apos;s top choice</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 border-b px-4 py-3 text-sm" role="status">
      {/* The verdict is the panel's headline: the move in mono, the judgement in display caps */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={`flex items-baseline gap-2 ${JUDGEMENT_TEXT[judgement]}`}>
          <span className="font-mono text-base font-bold">
            {san}
            {JUDGEMENT_GLYPHS[judgement]}
          </span>{" "}
          <span className="font-display text-2xl">{JUDGEMENT_LABELS[judgement]}</span>
        </span>
        {winDrop > 0 && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">−{winDrop}% win chance</span>
        )}
      </div>
      {explanation && <p className="text-pretty">{explanation}</p>}
      {puzzleId && (
        <Link
          href={`/puzzles#${encodeURIComponent(puzzleId)}`}
          className="mt-1 flex w-fit items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Puzzle className="size-4" aria-hidden /> Practice this position
        </Link>
      )}
    </div>
  )
}
