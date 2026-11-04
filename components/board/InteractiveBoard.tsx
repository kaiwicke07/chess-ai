"use client"

import { useEffect, useRef, useState } from "react"
import { Chess, type Square } from "chess.js"
import { Chessboard } from "react-chessboard"

import { playSound, soundForPositions } from "@/lib/sound"
import type { Color } from "@/lib/types"

const HIGHLIGHT = { backgroundColor: "color-mix(in oklch, var(--primary) 35%, transparent)" }
const SELECTED = { backgroundColor: "color-mix(in oklch, var(--primary) 55%, transparent)" }
const HINT = { boxShadow: "inset 0 0 0 4px var(--best)" }

/**
 * A board the user plays one side on, by dragging a piece or clicking it and
 * then its target. Only legal moves by `color` reach `onMove` (as UCI, pawns
 * auto-promoting to a queen); returning false snaps the piece back. Shared by
 * the puzzle solver and the opening drill.
 */
export function InteractiveBoard({
  id,
  fen,
  color,
  canMove,
  onMove,
  lastMove,
  hintSquare,
}: {
  id: string
  fen: string
  color: Color
  canMove: boolean
  onMove: (uci: string) => boolean
  lastMove: { from: string; to: string } | null
  hintSquare?: string | null
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const side = color === "white" ? "w" : "b"

  // Every position change on this board makes a move sound: the user's moves,
  // replies, replayed lines and revealed solutions alike. The first position
  // (a new puzzle or drill appearing) is silent.
  const previousFen = useRef(fen)
  useEffect(() => {
    if (previousFen.current === fen) return
    const chess = new Chess(fen)
    playSound(soundForPositions(previousFen.current, fen, chess.inCheck(), chess.isCheckmate()))
    previousFen.current = fen
  }, [fen])

  function tryMove(from: string, to: string): boolean {
    if (!canMove) return false
    const chess = new Chess(fen)
    const piece = chess.get(from as Square)
    if (!piece || piece.color !== side) return false
    if (!chess.moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) return false
    const promotion = piece.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : ""
    setSelected(null)
    return onMove(from + to + promotion)
  }

  function onSquareClick(square: string) {
    if (selected && tryMove(selected, square)) return
    const piece = new Chess(fen).get(square as Square)
    setSelected(canMove && piece?.color === side ? square : null)
  }

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) squareStyles[lastMove.from] = squareStyles[lastMove.to] = HIGHLIGHT
  if (selected) squareStyles[selected] = SELECTED
  if (hintSquare && canMove) squareStyles[hintSquare] = HINT

  return (
    <div className="overflow-hidden rounded-lg">
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: color,
          allowDragging: canMove,
          canDragPiece: ({ piece }) => piece.pieceType[0] === side,
          onPieceDrop: ({ sourceSquare, targetSquare }) => !!targetSquare && tryMove(sourceSquare, targetSquare),
          onSquareClick: ({ square }) => onSquareClick(square),
          animationDurationInMs: 200,
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
