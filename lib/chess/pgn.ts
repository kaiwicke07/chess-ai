import { Chess } from "chess.js"

/** "0:02:59.3" or "2:59.3" → 179300 ms */
export function parseClock(value: string): number | null {
  const parts = value.split(":").map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) return null
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts]
  return Math.round((h * 3600 + m * 60 + s) * 1000)
}

/**
 * Reads `[%clk ...]` comments in move order. Returns null unless there is
 * exactly one per ply, since a misaligned clock list is worse than none.
 */
export function parsePgnClocks(pgn: string, plyCount: number): number[] | null {
  const clocks: number[] = []
  for (const match of pgn.matchAll(/\[%clk\s+([\d:.]+)\]/g)) {
    const ms = parseClock(match[1])
    if (ms === null) return null
    clocks.push(ms)
  }
  return clocks.length === plyCount ? clocks : null
}

/** SAN moves of a PGN, or null if chess.js rejects it. */
export function pgnMoves(pgn: string): string[] | null {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch {
    return null
  }
  return chess.history()
}

/** Tag pairs like [ECO "B51"], without running a full PGN parse. */
export function pgnHeader(pgn: string, name: string): string | null {
  const match = pgn.match(new RegExp(`^\\[${name} "([^"]*)"\\]`, "m"))
  return match ? match[1] : null
}
