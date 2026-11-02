/**
 * Identifies a position regardless of how it was reached: the first four FEN
 * fields (pieces, side to move, castling rights, en passant square). The move
 * counters are dropped, so transpositions and repeated openings share a key.
 */
export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ")
}
