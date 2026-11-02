import { formatEval } from "@/lib/analysis/winProbability"
import { numberMoves, uciLineToSan } from "@/lib/chess/san"
import { ENGINE_NAME } from "@/lib/engine/engine"
import type { PositionEval } from "@/lib/types"

/** The engine's verdict on the shown position: eval, depth and best line. */
export function EngineLine({
  fen,
  entry,
  progress,
  error,
}: {
  fen: string
  entry: PositionEval | undefined
  progress: { done: number; total: number } | null
  error: string | null
}) {
  let line: React.ReactNode
  if (error) {
    line = <span className="text-destructive">{error}</span>
  } else if (!entry) {
    line = <span className="text-muted-foreground">Waiting for analysis…</span>
  } else if (entry.eval.kind === "checkmate") {
    line = <span className="text-muted-foreground">Checkmate</span>
  } else if (!entry.best) {
    line = <span className="text-muted-foreground">Game over</span>
  } else {
    const parts = numberMoves(fen, uciLineToSan(fen, entry.pv).slice(0, 8))
    line = (
      <span className="truncate font-mono">
        <span className="text-best">{parts[0]}</span> {parts.slice(1).join(" ")}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-base font-semibold tabular-nums">
          {entry ? formatEval(entry.eval) : "…"}
        </span>
        <span className="text-xs text-muted-foreground">
          {progress && progress.total
            ? `Analyzing ${progress.done}/${progress.total}`
            : entry
              ? `${ENGINE_NAME} · depth ${entry.depth}`
              : ENGINE_NAME}
        </span>
      </div>
      <div className="flex min-w-0">{line}</div>
    </div>
  )
}
