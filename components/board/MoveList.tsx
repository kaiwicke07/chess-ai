"use client"

import { useEffect, useRef } from "react"

import { JUDGEMENT_TEXT } from "@/components/review/judgementStyles"
import { JUDGEMENT_GLYPHS, JUDGEMENT_LABELS, type MoveAssessment } from "@/lib/analysis/classify"
import type { Position } from "@/lib/chess/positions"

/**
 * Moves in two columns, with ?!, ? and ?? on flagged moves. `ply` is the
 * number of plies played in the shown position, so the highlighted move is
 * positions[ply]; `assessments` is aligned the same way.
 */
export function MoveList({
  positions,
  assessments,
  ply,
  onSelect,
  footer,
}: {
  positions: Position[]
  assessments: (MoveAssessment | null)[]
  ply: number
  onSelect: (ply: number) => void
  footer?: React.ReactNode
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Keep the current move visible by scrolling only the list, never the page
  useEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list) return
    if (!active) {
      list.scrollTop = 0
      return
    }
    const top = active.offsetTop
    const bottom = top + active.offsetHeight
    if (top < list.scrollTop || bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 2
    }
  }, [ply])

  const rows: { number: number; white?: number; black?: number }[] = []
  for (let i = 1; i < positions.length; i += 2) {
    rows.push({ number: (i + 1) / 2, white: i, black: i + 1 < positions.length ? i + 1 : undefined })
  }

  const cell = (index: number | undefined) => {
    if (index === undefined) return <span />
    const active = index === ply
    const judgement = assessments[index]?.judgement
    return (
      <button
        ref={active ? activeRef : undefined}
        type="button"
        onClick={() => onSelect(index)}
        aria-current={active ? "step" : undefined}
        aria-label={judgement ? `${positions[index].lastMove?.san}, ${JUDGEMENT_LABELS[judgement]}` : undefined}
        className={`rounded px-2 py-0.5 text-left font-mono text-sm ${active ? "bg-primary/25 text-foreground" : "hover:bg-muted"} ${judgement ? JUDGEMENT_TEXT[judgement] : ""}`}
      >
        {positions[index].lastMove?.san}
        {judgement && <span className="font-semibold">{JUDGEMENT_GLYPHS[judgement]}</span>}
      </button>
    )
  }

  return (
    <div ref={listRef} className="relative max-h-72 overflow-y-auto lg:max-h-[26rem]" aria-label="Moves">
      <ol className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 p-2">
        {rows.map((row) => (
          <li key={row.number} className="contents">
            <span className="py-0.5 text-right pr-2 font-mono text-sm text-muted-foreground">{row.number}.</span>
            {cell(row.white)}
            {cell(row.black)}
          </li>
        ))}
      </ol>
      {footer}
    </div>
  )
}
