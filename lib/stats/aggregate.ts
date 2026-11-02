import type { Color, ReviewLog } from "@/lib/types"
import type { GamePhase, GameStats, MoveStat } from "./gameStats"

const DAY = 24 * 3600_000

/** Monday 00:00 (local time) of the week containing `ts`. */
export function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const sinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - sinceMonday)
  return d.getTime()
}

/** Error counts for a set of moves, as rates per 100 moves. */
export interface ErrorRates {
  moves: number
  blunders: number
  mistakes: number
  /** Blunders per 100 moves */
  blunderRate: number
  /** Mistakes and blunders per 100 moves */
  errorRate: number
  /** Mean per-move accuracy */
  accuracy: number
}

export function errorRates(moves: MoveStat[]): ErrorRates {
  const blunders = moves.filter((m) => m.judgement === "blunder").length
  const mistakes = moves.filter((m) => m.judgement === "mistake").length
  const n = moves.length
  return {
    moves: n,
    blunders,
    mistakes,
    blunderRate: n ? (blunders / n) * 100 : 0,
    errorRate: n ? ((blunders + mistakes) / n) * 100 : 0,
    accuracy: n ? moves.reduce((sum, m) => sum + m.accuracy, 0) / n : 0,
  }
}

export interface WeekPoint {
  week: number
  games: number
  /** Blunders per 100 moves that week; null without analyzed games */
  blunderRate: number | null
  /** Mean game accuracy (Lichess formula) */
  accuracy: number | null
  puzzles: number
  /** Share of puzzle attempts solved with no wrong move and no hint */
  puzzleClean: number | null
}

/**
 * One point per week from the first game or puzzle attempt to the last,
 * including empty weeks (as nulls) so gaps show as gaps, not as flat lines.
 * Game weeks come from when games were played, so history fills in at once.
 */
export function weeklyTrends(games: GameStats[], reviews: ReviewLog[]): WeekPoint[] {
  const stamps = [...games.map((g) => g.playedAt), ...reviews.map((r) => r.reviewedAt)]
  if (!stamps.length) return []
  const first = weekStart(Math.min(...stamps))
  const last = weekStart(Math.max(...stamps))

  const points: WeekPoint[] = []
  // Step by days and re-anchor, so daylight-saving shifts can't skip a week
  for (let week = first; week <= last; week = weekStart(week + 8 * DAY)) {
    const inWeek = games.filter((g) => weekStart(g.playedAt) === week)
    const attempts = reviews.filter((r) => weekStart(r.reviewedAt) === week)
    const accuracies = inWeek.map((g) => g.accuracy).filter((a): a is number => a !== null)
    const moves = inWeek.flatMap((g) => g.moves)
    points.push({
      week,
      games: inWeek.length,
      blunderRate: moves.length ? errorRates(moves).blunderRate : null,
      accuracy: accuracies.length ? accuracies.reduce((s, a) => s + a, 0) / accuracies.length : null,
      puzzles: attempts.length,
      puzzleClean: attempts.length ? attempts.filter((r) => r.outcome === "clean").length / attempts.length : null,
    })
  }
  return points
}

export interface PeriodSummary {
  games: number
  /** Mean game accuracy; null without analyzed games */
  accuracy: number | null
  blunderRate: number | null
  puzzles: number
  puzzleClean: number | null
}

/** Headline numbers for a set of games and puzzle attempts (one period). */
export function summarize(games: GameStats[], reviews: ReviewLog[]): PeriodSummary {
  const accuracies = games.map((g) => g.accuracy).filter((a): a is number => a !== null)
  const moves = games.flatMap((g) => g.moves)
  return {
    games: games.length,
    accuracy: accuracies.length ? accuracies.reduce((s, a) => s + a, 0) / accuracies.length : null,
    blunderRate: moves.length ? errorRates(moves).blunderRate : null,
    puzzles: reviews.length,
    puzzleClean: reviews.length ? reviews.filter((r) => r.outcome === "clean").length / reviews.length : null,
  }
}

export interface OpeningRow extends ErrorRates {
  opening: string
  color: Color
  games: number
  /** Points per game from the user's side: win 1, draw ½ */
  score: number
}

/** Per opening family and color, most played first. */
export function byOpening(games: GameStats[]): OpeningRow[] {
  const groups = new Map<string, GameStats[]>()
  for (const g of games) {
    const key = `${g.opening}|${g.color}`
    groups.set(key, [...(groups.get(key) ?? []), g])
  }
  return [...groups.values()]
    .map((group) => ({
      opening: group[0].opening,
      color: group[0].color,
      games: group.length,
      score: group.reduce((s, g) => s + (g.result === "win" ? 1 : g.result === "draw" ? 0.5 : 0), 0) / group.length,
      ...errorRates(group.flatMap((g) => g.moves)),
    }))
    .sort((a, b) => b.games - a.games || a.opening.localeCompare(b.opening))
}

export function byPhase(games: GameStats[]): Record<GamePhase, ErrorRates> {
  const moves = games.flatMap((g) => g.moves)
  return {
    opening: errorRates(moves.filter((m) => m.phase === "opening")),
    middlegame: errorRates(moves.filter((m) => m.phase === "middlegame")),
    endgame: errorRates(moves.filter((m) => m.phase === "endgame")),
  }
}

/** Moves made in and out of time pressure; games without clocks are left out. */
export function byPressure(games: GameStats[]): { pressure: ErrorRates; calm: ErrorRates } {
  const moves = games.flatMap((g) => g.moves)
  return {
    pressure: errorRates(moves.filter((m) => m.pressure === true)),
    calm: errorRates(moves.filter((m) => m.pressure === false)),
  }
}
