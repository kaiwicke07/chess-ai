import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS, type Judgement, type MoveAssessment } from "@/lib/analysis/classify"
import type { Color, Game } from "@/lib/types"

const ORDER: Judgement[] = ["inaccuracy", "mistake", "blunder"]

/** Accuracy and ?! / ? / ?? counts for both players, shown once analysis is complete. */
export function AccuracySummary({
  game,
  accuracy,
  assessments,
}: {
  game: Game
  accuracy: Record<Color, number | null>
  assessments: (MoveAssessment | null)[]
}) {
  const counts: Record<Color, Record<Judgement, number>> = {
    white: { inaccuracy: 0, mistake: 0, blunder: 0 },
    black: { inaccuracy: 0, mistake: 0, blunder: 0 },
  }
  for (const a of assessments) if (a?.judgement) counts[a.color][a.judgement]++

  return (
    <div className="flex flex-col gap-1.5 border-b px-4 py-3 text-sm">
      {(["white", "black"] as const).map((color) => (
        <div key={color} className="flex items-center gap-2">
          <span
            className={`size-3 shrink-0 rounded-full ring-1 ring-foreground/30 ${color === "white" ? "bg-neutral-100" : "bg-neutral-900"}`}
            aria-label={color}
          />
          <span className="min-w-0 flex-1 truncate">
            {game[color].name}
            {color === game.userColor && (
              <span className="text-xs font-semibold text-muted-foreground"> (you)</span>
            )}
          </span>
          <span className="flex gap-2 font-mono text-xs tabular-nums">
            {ORDER.map((judgement) => (
              <span
                key={judgement}
                className={counts[color][judgement] ? `font-semibold ${JUDGEMENT_TEXT[judgement]}` : "text-muted-foreground"}
                title={`${counts[color][judgement]} ${JUDGEMENT_LABELS[judgement].toLowerCase()}${counts[color][judgement] === 1 ? "" : "s"}`}
              >
                {counts[color][judgement]}
                {JUDGEMENT_GLYPHS[judgement]}
              </span>
            ))}
          </span>
          <span className="w-16 text-right font-mono text-base font-bold tabular-nums" title="Accuracy (Lichess formula)">
            {accuracy[color] === null ? "–" : `${Math.round(accuracy[color]!)}%`}
          </span>
        </div>
      ))}
    </div>
  )
}
