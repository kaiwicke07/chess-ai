import { formatEval, winPercent } from "@/lib/analysis/winProbability"
import type { Color, Eval } from "@/lib/types"

/**
 * Vertical bar beside the board. The white share is white's win chance, so
 * +0.3 barely moves it while +3 fills most of it, matching how games feel.
 */
export function EvalBar({ evaluation, orientation }: { evaluation: Eval | undefined; orientation: Color }) {
  const white = evaluation ? winPercent(evaluation) : 50
  const label = evaluation ? formatEval(evaluation).replace(/^[+-]/, "") : ""
  const whiteAhead = white >= 50
  // The label sits at the end of the side that is ahead
  const labelAtBottom = whiteAhead === (orientation === "white")

  return (
    <div
      className="relative w-5 shrink-0 overflow-hidden rounded-md bg-neutral-800"
      role="img"
      aria-label={evaluation ? `Evaluation ${formatEval(evaluation)}` : "Evaluation pending"}
    >
      <div
        className="absolute inset-x-0 rounded-xl bg-card transition-[height] duration-300"
        style={{ height: `${white}%`, [orientation === "white" ? "bottom" : "top"]: 0 }}
      />
      {label && (
        <span
          className={`absolute inset-x-0 text-center font-mono text-[9px] leading-none font-semibold ${labelAtBottom ? "bottom-1" : "top-1"} ${whiteAhead ? "text-neutral-800" : "text-neutral-100"}`}
        >
          {label}
        </span>
      )}
    </div>
  )
}
