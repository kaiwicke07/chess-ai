import type { Game } from "@/lib/types"

export const SPEED_LABELS: Record<Game["speed"], string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
}

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

/** Clock display: "2:59", "1:02:03", and tenths under 10 seconds: "0:09.3" */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const ss = String(s).padStart(2, "0")
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`
  if (clamped < 10_000) return `${m}:${ss}.${Math.floor((clamped % 1000) / 100)}`
  return `${m}:${ss}`
}

const OUTCOME_SUFFIX: Record<Game["termination"], string> = {
  checkmate: " by checkmate",
  resignation: " by resignation",
  timeout: " on time",
  abandoned: " by abandonment",
  draw: "",
  other: "",
}

/** "You won by resignation", "You lost on time", "Draw" */
export function formatOutcome(game: Pick<Game, "result" | "termination">): string {
  if (game.result === "draw") return "Draw"
  return `You ${game.result === "win" ? "won" : "lost"}${OUTCOME_SUFFIX[game.termination]}`
}

/** "1-0", "0-1" or "½-½" from white's point of view */
export function formatScore(game: Pick<Game, "result" | "userColor">): string {
  if (game.result === "draw") return "½-½"
  const whiteWon = (game.result === "win") === (game.userColor === "white")
  return whiteWon ? "1-0" : "0-1"
}

/** Full moves, rounded up: 73 plies → 37 moves */
export function moveCount(game: Game): number {
  return Math.ceil(game.moves.length / 2)
}
