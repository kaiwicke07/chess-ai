import { Chess, type PieceSymbol, type Square } from "chess.js"

import { PIECE_VALUES } from "@/lib/chess/material"
import { lineFacts } from "@/lib/explain/facts"
import type { Color, PuzzleTheme } from "@/lib/types"

export const THEME_LABELS: Record<PuzzleTheme, string> = {
  mate: "Mate",
  hangingPiece: "Hanging piece",
  fork: "Fork",
  material: "Win material",
  advantage: "Advantage",
  defense: "Defense",
}

/** At or above this win chance after the best move, a quiet puzzle is about pressing an advantage. */
const ADVANTAGE_WIN = 60

/**
 * Tags a puzzle from what its solution does on the board, in code, so themes
 * are facts about the line rather than guesses:
 * - mate: the solution ends in checkmate
 * - fork: the first move attacks two or more pieces worth more than the
 *   attacker (or the king plus another piece)
 * - hangingPiece: the first move takes a piece for free
 * - material: the line wins at least two pawns' worth overall
 * - advantage / defense: none of the above; which one depends on whether the
 *   best move leaves the user clearly better (`win`, 0–100) or only holding
 */
export function tagThemes(
  fen: string,
  solution: string[],
  color: Color,
  win: number,
): { themes: PuzzleTheme[]; mateIn: number | null } {
  const facts = lineFacts(fen, solution, color, solution.length)
  const last = facts.steps.at(-1)
  if (last && new Chess(last.fen).isCheckmate()) {
    return { themes: ["mate"], mateIn: Math.ceil(solution.length / 2) }
  }

  const themes: PuzzleTheme[] = []
  const first = facts.steps[0]
  if (first && isFork(first.fen, first.to as Square, color)) themes.push("fork")
  if (first?.captured && facts.materialChange >= PIECE_VALUES[first.captured] && PIECE_VALUES[first.captured] >= 1) {
    themes.push("hangingPiece")
  }
  if (facts.materialChange >= 2) themes.push("material")
  if (!themes.length) themes.push(win >= ADVANTAGE_WIN ? "advantage" : "defense")
  return { themes, mateIn: null }
}

/** Does the piece on `square` attack two targets worth more than itself (the king always counts)? */
export function isFork(fen: string, square: Square, attacker: Color): boolean {
  const chess = new Chess(fen)
  const piece = chess.get(square)
  if (!piece) return false
  const own = attacker === "white" ? "w" : "b"
  const value = PIECE_VALUES[piece.type]

  let targets = 0
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color === own) continue
      const worthIt = cell.type === "k" || PIECE_VALUES[cell.type as PieceSymbol] > value
      if (worthIt && chess.attackers(cell.square, own).includes(square)) targets++
    }
  }
  return targets >= 2
}
