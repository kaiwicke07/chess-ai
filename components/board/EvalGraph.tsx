"use client"

import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { JUDGEMENT_COLORS } from "@/components/review/judgementStyles"
import type { MoveAssessment } from "@/lib/analysis/classify"
import { winPercent } from "@/lib/analysis/winProbability"
import type { PositionEval } from "@/lib/types"

/**
 * White's win chance across the game: the light area is white's share, the
 * line at 50 is equality. Dots mark mistakes and blunders. Click anywhere to
 * jump to that move.
 */
export function EvalGraph({
  evals,
  assessments,
  ply,
  onSelect,
}: {
  evals: (PositionEval | undefined)[]
  assessments: (MoveAssessment | null)[]
  ply: number
  onSelect: (ply: number) => void
}) {
  // Unanalyzed positions are null, so the curve grows as analysis runs
  const data = evals.map((entry, index) => ({ ply: index, white: entry ? winPercent(entry.eval) : null }))
  // Inaccuracies are left off; marking every one makes the graph noisy
  const marks = assessments.filter(
    (a): a is MoveAssessment & { judgement: "mistake" | "blunder" } =>
      a?.judgement === "mistake" || a?.judgement === "blunder",
  )

  return (
    <div className="h-24 cursor-pointer bg-neutral-900" aria-label="Evaluation graph">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          onClick={(state) => {
            if (state.activeIndex !== undefined) onSelect(Number(state.activeIndex))
          }}
        >
          <XAxis dataKey="ply" type="number" domain={[0, Math.max(1, evals.length - 1)]} hide />
          <YAxis domain={[0, 100]} hide />
          {/* Needed for click-to-select; renders no tooltip box */}
          <Tooltip content={() => null} cursor={{ stroke: "var(--muted-foreground)" }} />
          <Area
            dataKey="white"
            type="linear"
            baseValue={0}
            stroke="var(--foreground)"
            strokeWidth={1}
            fill="var(--foreground)"
            fillOpacity={0.8}
            isAnimationActive={false}
          />
          <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          <ReferenceLine x={ply} stroke="var(--primary)" strokeWidth={2} />
          {marks.map((mark) => (
            <ReferenceDot
              key={mark.ply}
              x={mark.ply}
              y={data[mark.ply].white ?? 50}
              r={3.5}
              fill={JUDGEMENT_COLORS[mark.judgement]}
              stroke="var(--background)"
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
