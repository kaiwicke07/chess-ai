"use client"

import { Chessboard } from "react-chessboard"

/**
 * The landing page's example position, just after 14. Qd2?? (the queen came
 * from d4, where it guarded the e5 knight). Illustrative only: no game is loaded.
 */
const FEN = "r1bq1rk1/pp3ppp/2pb1n2/3pN3/8/2NP4/PPPQBPPP/R1B2RK1 b - - 3 14"

/** Read-only board for the landing page: the blunder and the better move. */
export function CoverBoard() {
  return (
    <div className="overflow-hidden rounded-lg">
      <Chessboard
        options={{
          id: "cover-board",
          position: FEN,
          allowDragging: false,
          allowDrawingArrows: false,
          arrows: [
            { startSquare: "d4", endSquare: "d2", color: "var(--blunder)" },
            { startSquare: "f2", endSquare: "f4", color: "var(--best)" },
          ],
          squareStyles: {
            e5: { backgroundColor: "color-mix(in oklch, var(--blunder) 45%, transparent)" },
          },
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          darkSquareNotationStyle: { color: "var(--board-light)" },
          lightSquareNotationStyle: { color: "var(--board-dark)" },
        }}
      />
    </div>
  )
}
