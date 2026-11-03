"use client"

import { useEffect, useMemo, useState } from "react"
import { Cpu } from "lucide-react"

import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { Button } from "@/components/ui/button"
import { gameAccuracy } from "@/lib/analysis/accuracy"
import { assessMoves, JUDGEMENT_GLYPHS, type Judgement } from "@/lib/analysis/classify"
import { replayUci } from "@/lib/chess/positions"
import { numberMoves } from "@/lib/chess/san"
import { analysisQueue } from "@/lib/engine/queue"
import { plural } from "@/lib/format"
import type { Color, PositionEval } from "@/lib/types"

/**
 * After a replay: evaluates its positions with the regular analysis engine
 * (cached like any other) and scores the user's moves with the same rules as
 * a game review. Runs only when asked, since it takes a few seconds.
 */
export function ReplayAnalysis({ startFen, moves, userColor }: { startFen: string; moves: string[]; userColor: Color }) {
  const positions = useMemo(() => replayUci(startFen, moves), [startFen, moves])
  const [evals, setEvals] = useState<(PositionEval | undefined)[] | null>(null)
  const [done, setDone] = useState(0)

  // Evaluate one position at a time; each result is set from the promise
  useEffect(() => {
    if (!evals || done >= positions.length || !analysisQueue) return
    let cancelled = false
    void analysisQueue.evaluate(positions[done].fen).then((result) => {
      if (cancelled) return
      setEvals((current) => current && current.map((e, i) => (i === done ? result : e)))
      setDone((d) => d + 1)
    })
    return () => {
      cancelled = true
    }
  }, [evals, done, positions])

  if (!evals) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setEvals(positions.map(() => undefined))}>
        <Cpu aria-hidden /> Analyze my moves
      </Button>
    )
  }
  if (done < positions.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Cpu className="size-4 animate-pulse text-primary" aria-hidden /> Analyzing {done} of {positions.length}…
      </p>
    )
  }

  const assessments = assessMoves(positions, evals)
  const startColor: Color = startFen.split(" ")[1] === "w" ? "white" : "black"
  const accuracy = gameAccuracy(
    evals.map((e) => e!.eval),
    startColor,
  )[userColor]
  const counts: Record<Judgement, number> = { inaccuracy: 0, mistake: 0, blunder: 0 }
  for (const a of assessments) if (a?.color === userColor && a.judgement) counts[a.judgement]++
  const sans = numberMoves(
    startFen,
    positions.slice(1).map((p) => p.lastMove!.san),
  )

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
      <p>
        Your accuracy:{" "}
        <span className="font-mono text-base font-bold tabular-nums">
          {accuracy === null ? "–" : `${Math.round(accuracy)}%`}
        </span>
        <span className="text-muted-foreground">
          {" "}
          · {plural(counts.blunder, "blunder")} · {plural(counts.mistake, "mistake")} ·{" "}
          {counts.inaccuracy === 1 ? "1 inaccuracy" : `${counts.inaccuracy} inaccuracies`}
        </span>
      </p>
      <p className="flex flex-wrap gap-x-1.5 font-mono tabular-nums">
        {sans.map((san, i) => {
          const a = assessments[i + 1]
          const mine = a?.color === userColor
          return (
            <span key={i} className={mine && a?.judgement ? `font-semibold ${JUDGEMENT_TEXT[a.judgement]}` : mine ? "" : "text-muted-foreground"}>
              {san}
              {mine && a?.judgement && JUDGEMENT_GLYPHS[a.judgement]}
            </span>
          )
        })}
      </p>
    </div>
  )
}
