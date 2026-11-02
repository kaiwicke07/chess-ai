"use client"

import { Chessboard, type Arrow } from "react-chessboard"

import type { Position } from "@/lib/chess/positions"
import type { Color } from "@/lib/types"

// Board colors come from the theme tokens in globals.css
const LAST_MOVE = { backgroundColor: "color-mix(in oklch, var(--primary) 35%, transparent)" }

/** Read-only board showing one position, with the last move highlighted. */
export function ReviewBoard({
  position,
  orientation,
  arrows = [],
}: {
  position: Position
  orientation: Color
  arrows?: Arrow[]
}) {
  const squareStyles = position.lastMove
    ? { [position.lastMove.from]: LAST_MOVE, [position.lastMove.to]: LAST_MOVE }
    : {}

  return (
    <div className="overflow-hidden rounded-lg">
      <Chessboard
        options={{
          id: "review-board",
          position: position.fen,
          boardOrientation: orientation,
          allowDragging: false,
          allowDrawingArrows: true,
          arrows,
          animationDurationInMs: 150,
          squareStyles,
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          darkSquareNotationStyle: { color: "var(--board-light)" },
          lightSquareNotationStyle: { color: "var(--board-dark)" },
        }}
      />
    </div>
  )
}
