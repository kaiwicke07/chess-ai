import { gameAccuracy } from "@/lib/analysis/accuracy"
import { assessMoves, type Judgement } from "@/lib/analysis/classify"
import { PIECE_VALUES } from "@/lib/chess/material"
import { clocksAt, type Position } from "@/lib/chess/positions"
import type { Color, Game, PositionEval, Result, Speed } from "@/lib/types"

export type GamePhase = "opening" | "middlegame" | "endgame"

/** Moves up to this ply count as the opening (move 10 for both sides). */
export const OPENING_END_PLY = 20

/** Non-pawn material on the board, both sides, at or below which it's an endgame. */
export const ENDGAME_MATERIAL = 26

/** Time pressure: under 30 s, or under 10% of the starting time, whichever comes first. */
export const PRESSURE_SECONDS = 30
export const PRESSURE_SHARE = 0.1

export interface MoveStat {
  ply: number
  phase: GamePhase
  judgement: Judgement | null
  accuracy: number
  /** Null when the game has no clock data */
  pressure: boolean | null
}

export interface GameStats {
  gameId: string
  playedAt: number
  speed: Speed
  color: Color
  result: Result
  /** Normalized opening family, comparable across Lichess and Chess.com */
  opening: string
  accuracy: number | null
  moves: MoveStat[]
}

/**
 * Game phase of a position: the first OPENING_END_PLY plies are the opening;
 * after that it's an endgame once the queens, rooks and minor pieces left add
 * up to ENDGAME_MATERIAL or less (two rooks and a minor each is 26).
 */
export function phaseOf(fen: string, ply: number): GamePhase {
  if (ply <= OPENING_END_PLY) return "opening"
  let pieces = 0
  for (const char of fen.split(" ")[0]) {
    const type = char.toLowerCase()
    if (type !== "p" && type !== "k" && type in PIECE_VALUES) pieces += PIECE_VALUES[type as keyof typeof PIECE_VALUES]
  }
  return pieces <= ENDGAME_MATERIAL ? "endgame" : "middlegame"
}

/** Is a remaining clock (ms) in time pressure for a game that started with `initialSeconds`? */
export function inTimePressure(clockMs: number, initialSeconds: number): boolean {
  return clockMs < Math.max(PRESSURE_SECONDS, initialSeconds * PRESSURE_SHARE) * 1000
}

/**
 * Lichess and Chess.com name openings differently ("Caro-Kann Defense: Advance
 * Variation" vs "Caro Kann Defense Advance Variation"), so group by family:
 * drop the variation after a colon, apostrophes and hyphens, keep two words.
 */
export function openingFamily(name: string | null): string {
  if (!name) return "Unknown opening"
  const words = name
    .split(":")[0]
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (!words.length) return "Unknown opening"
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

/** Per-move facts for the user's moves in one fully analyzed game. */
export function gameStats(game: Game, positions: Position[], evals: PositionEval[]): GameStats {
  const assessments = assessMoves(positions, evals)
  const moves: MoveStat[] = []
  for (const a of assessments) {
    if (!a || a.color !== game.userColor) continue
    const clocks = clocksAt(game, a.ply - 1)
    moves.push({
      ply: a.ply,
      phase: phaseOf(positions[a.ply - 1].fen, a.ply),
      judgement: a.judgement,
      accuracy: a.accuracy,
      pressure: clocks ? inTimePressure(clocks[game.userColor], game.timeControl.initial) : null,
    })
  }
  return {
    gameId: game.id,
    playedAt: game.playedAt,
    speed: game.speed,
    color: game.userColor,
    result: game.result,
    opening: openingFamily(game.opening.name),
    accuracy: gameAccuracy(evals.map((e) => e.eval))[game.userColor],
    moves,
  }
}
