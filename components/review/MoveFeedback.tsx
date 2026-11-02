import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS, type MoveAssessment } from "@/lib/analysis/classify"

/** Verdict on the move that led to the shown position, with the explanation. */
export function MoveFeedback({
  san,
  assessment,
  explanation,
}: {
  san: string
  assessment: MoveAssessment
  explanation: string | null
}) {
  const { judgement } = assessment
  const winDrop = Math.round(assessment.winBefore - assessment.winAfter)

  if (!judgement) {
    if (!assessment.best) return null
    return (
      <div className="border-t px-4 py-3 text-sm">
        <span className="font-medium text-best">{san} is the best move</span>
        <span className="text-muted-foreground"> · Stockfish&apos;s top choice</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm" role="status">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-medium ${JUDGEMENT_TEXT[judgement]}`}>
          {san}
          {JUDGEMENT_GLYPHS[judgement]} {JUDGEMENT_LABELS[judgement]}
        </span>
        {winDrop > 0 && <span className="text-xs text-muted-foreground tabular-nums">−{winDrop}% win chance</span>}
      </div>
      {explanation && <p className="text-pretty">{explanation}</p>}
    </div>
  )
}
