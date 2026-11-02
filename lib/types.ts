export type Platform = "lichess" | "chesscom"
export type Color = "white" | "black"

/** Always from the point of view of the account the game was imported for. */
export type Result = "win" | "loss" | "draw"

/** Correspondence and daily games are skipped at import (see lib/sources). */
export type Speed = "bullet" | "blitz" | "rapid" | "classical"

export type Termination =
  | "checkmate"
  | "resignation"
  | "timeout"
  | "draw"
  | "abandoned"
  | "other"

export interface Player {
  name: string
  rating: number | null
}

export interface Game {
  /** `${platform}:${sourceId}`, unique across both sites */
  id: string
  platform: Platform
  sourceId: string
  /** `${platform}:${lowercased username}`, the account this game belongs to */
  account: string
  url: string
  /** Game start, ms since epoch */
  playedAt: number
  rated: boolean
  speed: Speed
  /** Seconds */
  timeControl: { initial: number; increment: number }
  white: Player
  black: Player
  userColor: Color
  result: Result
  termination: Termination
  opening: { eco: string | null; name: string | null }
  /** SAN moves from the standard starting position */
  moves: string[]
  /** Remaining time in ms after each ply, aligned with `moves`; null when unavailable */
  clocks: number[] | null
}

/**
 * A position's evaluation, always from white's point of view, so a whole
 * game reads as one curve no matter whose turn it is.
 */
export type Eval =
  | { kind: "cp"; cp: number }
  /** > 0: white mates in n; < 0: black mates in n */
  | { kind: "mate"; moves: number }
  /** The position on the board is already checkmate */
  | { kind: "checkmate"; winner: Color }

export interface PositionEval {
  /** Position key, see lib/chess/positionKey.ts */
  key: string
  depth: number
  eval: Eval
  /** Best move in UCI notation (e2e4), null when the game is over */
  best: string | null
  /** Principal variation in UCI notation, starting with `best` */
  pv: string[]
}

/** Marks a game whose every position has an eval at `depth` or deeper. */
export interface GameAnalysis {
  gameId: string
  depth: number
  completedAt: number
}

export interface Account {
  /** Same format as Game.account */
  id: string
  platform: Platform
  username: string
  lastSyncedAt: number
}
