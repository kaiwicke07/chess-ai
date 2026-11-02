import type { Eval } from "@/lib/types"
import { winPercent } from "./winProbability"

/**
 * One move's accuracy, 0–100, from the mover's win chance before and after
 * (lila AccuracyPercent.fromWinPercents). Lichess fitted the exponential to
 * hand-picked points (0 → 100, 10 → 60, 40 → 20, 80 → 0) and adds 1 point as
 * an "uncertainty bonus" for imperfect analysis. Not losing ground is 100.
 */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) return 100
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * (winBefore - winAfter)) - 3.166924740191411
  return Math.max(0, Math.min(100, raw + 1))
}

/**
 * Each player's accuracy over a game (lila AccuracyPercent.gameAccuracy).
 * `evals` is every position from the start, white's view. The result is the
 * average of two means of the per-move accuracies:
 * - a mean weighted by volatility (the spread of win % in a window around the
 *   move), so moves in sharp positions count more than shuffling in a dead one
 * - a harmonic mean, which punishes a few very bad moves more than a plain mean
 * Returns null for a player with no moves. `startColor` is who moves first
 * (black, for a replay that starts on black's move), as in Lichess.
 */
export function gameAccuracy(
  evals: Eval[],
  startColor: "white" | "black" = "white",
): { white: number | null; black: number | null } {
  const wins = evals.map(winPercent)
  const moves = wins.length - 1
  if (moves < 1) return { white: null, black: null }

  // Window of positions used to measure volatility at each move
  const windowSize = Math.max(2, Math.min(8, Math.floor(moves / 10)))
  const windows = slidingWindows(wins, windowSize)
  // Pad the start so there is exactly one window per move
  const padded = [...Array(Math.max(0, Math.min(windowSize, wins.length) - 2)).fill(wins.slice(0, windowSize)), ...windows]
  const weights = padded.map((window) => Math.max(0.5, Math.min(12, standardDeviation(window))))

  const byColor: Record<"white" | "black", { accuracy: number; weight: number }[]> = { white: [], black: [] }
  for (let i = 0; i < moves; i++) {
    const [prev, next] = [wins[i], wins[i + 1]]
    const white = (i % 2 === 0) === (startColor === "white")
    // Black's win % is 100 − white's, so its drop is next − prev
    const accuracy = white ? moveAccuracy(prev, next) : moveAccuracy(next, prev)
    byColor[white ? "white" : "black"].push({ accuracy, weight: weights[i] })
  }

  const combine = (list: { accuracy: number; weight: number }[]) =>
    list.length ? (weightedMean(list) + harmonicMean(list.map((m) => m.accuracy))) / 2 : null
  return { white: combine(byColor.white), black: combine(byColor.black) }
}

/** Like Scala's List.sliding: one window of everything if the list is shorter. */
function slidingWindows(values: number[], size: number): number[][] {
  if (values.length <= size) return [values]
  return Array.from({ length: values.length - size + 1 }, (_, i) => values.slice(i, i + size))
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
}

function weightedMean(list: { accuracy: number; weight: number }[]): number {
  const totalWeight = list.reduce((sum, m) => sum + m.weight, 0)
  return list.reduce((sum, m) => sum + m.accuracy * m.weight, 0) / totalWeight
}

/** A single 0 makes the harmonic mean 0, as in Lichess (n / ∞). */
function harmonicMean(values: number[]): number {
  if (values.some((v) => v <= 0)) return 0
  return values.length / values.reduce((sum, v) => sum + 1 / v, 0)
}
