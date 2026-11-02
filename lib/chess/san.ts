import { Chess } from "chess.js"

/**
 * Adds move numbers to a SAN line starting from `fen`, the way books print it:
 * ["e5", "Nf3"] with black to move on move 1 → ["1… e5", "2. Nf3"]
 */
export function numberMoves(fen: string, san: string[]): string[] {
  const [, turn, , , , fullmove] = fen.split(" ")
  let number = Number(fullmove) || 1
  let whiteToMove = turn === "w"
  const numbered: string[] = []

  for (const [i, move] of san.entries()) {
    if (whiteToMove) numbered.push(`${number}. ${move}`)
    else numbered.push(i === 0 ? `${number}… ${move}` : move)
    if (!whiteToMove) number++
    whiteToMove = !whiteToMove
  }
  return numbered
}

/**
 * Converts an engine line in UCI notation (e2e4 e7e5 g1f3) to SAN
 * (e4 e5 Nf3), stopping at the first move that isn't legal.
 */
export function uciLineToSan(fen: string, uciMoves: string[]): string[] {
  const chess = new Chess(fen)
  const san: string[] = []
  for (const uci of uciMoves) {
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      san.push(move.san)
    } catch {
      break
    }
  }
  return san
}
