/** Stockfish's own view of a score: from the side to move, not white. */
export type UciScore = { type: "cp"; value: number } | { type: "mate"; value: number }

export interface UciInfo {
  depth: number
  multipv: number
  score: UciScore
  pv: string[]
}

/**
 * Parses one search `info` line, e.g.
 * "info depth 14 seldepth 20 multipv 1 score cp 28 nodes 51234 ... pv d2d4 d7d5".
 * Returns null for info lines without a score and PV (currmove, string, etc.).
 */
export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith("info ")) return null
  const tokens = line.split(" ")
  const at = (name: string) => tokens.indexOf(name)

  const depthAt = at("depth")
  const scoreAt = at("score")
  const pvAt = at("pv")
  if (depthAt < 0 || scoreAt < 0 || pvAt < 0) return null

  const type = tokens[scoreAt + 1]
  const value = Number(tokens[scoreAt + 2])
  if ((type !== "cp" && type !== "mate") || Number.isNaN(value)) return null

  const multipvAt = at("multipv")
  return {
    depth: Number(tokens[depthAt + 1]),
    multipv: multipvAt >= 0 ? Number(tokens[multipvAt + 1]) : 1,
    score: { type, value },
    pv: tokens.slice(pvAt + 1),
  }
}
