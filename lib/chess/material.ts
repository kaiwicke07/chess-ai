import type { PieceSymbol } from "chess.js"

import type { Color } from "@/lib/types"

/** Standard piece values in pawns. */
export const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
}

/** `color`'s material minus the opponent's, in pawns, read straight from the FEN. */
export function materialBalance(fen: string, color: Color): number {
  let balance = 0
  for (const char of fen.split(" ")[0]) {
    const value = PIECE_VALUES[char.toLowerCase() as PieceSymbol]
    if (value === undefined) continue // digits and slashes
    const white = char === char.toUpperCase()
    balance += white === (color === "white") ? value : -value
  }
  return balance
}

/** "a pawn", "a piece", "the queen", or "4 points of material" */
export function describeMaterial(pawns: number): string {
  const names: Record<number, string> = { 1: "a pawn", 2: "two pawns", 3: "a piece", 5: "a rook", 9: "the queen" }
  return names[pawns] ?? `${pawns} points of material`
}
