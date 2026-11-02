import type { Game } from "@/lib/types"

/** { initial: 180, increment: 2 } → "3+2"; sub-minute starts show seconds, e.g. "30s+0" */
export function formatTimeControl({ initial, increment }: Game["timeControl"]): string {
  const start = initial < 60 ? `${initial}s` : String(initial / 60)
  return `${start}+${increment}`
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600_000],
  ["month", 30 * 24 * 3600_000],
  ["week", 7 * 24 * 3600_000],
  ["day", 24 * 3600_000],
  ["hour", 3600_000],
  ["minute", 60_000],
]

/** "3 hours ago", "yesterday", "just now" */
export function formatRelative(timestamp: number, now = Date.now()): string {
  const diff = timestamp - now
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relative.format(Math.round(diff / ms), unit)
  }
  return "just now"
}

/** Full moves, rounded up: 73 plies → 37 moves */
export function moveCount(game: Game): number {
  return Math.ceil(game.moves.length / 2)
}
