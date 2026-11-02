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
  /** Puzzle generator version this game was scanned with; missing if never scanned */
  puzzleVersion?: number
}

export type PuzzleTheme = "mate" | "hangingPiece" | "fork" | "material" | "advantage" | "defense"

/** A position from the user's own game where one move is clearly best. */
export interface Puzzle {
  /** `${gameId}:${ply}` */
  id: string
  gameId: string
  account: string
  /** Index into the game's positions of the puzzle's start (user to move) */
  ply: number
  fen: string
  color: Color
  /** UCI moves: the user's, the opponent's reply, the user's, …; always ends on a user move */
  solution: string[]
  themes: PuzzleTheme[]
  /** Moves to mate, when the solution ends in checkmate */
  mateIn: number | null
  /** The opponent's move that led to the start position, for context on the board */
  previousMove: { from: string; to: string } | null
  /** What the user actually played in the game */
  played: { uci: string; san: string; judgement: "mistake" | "blunder" }
  createdAt: number
}

export interface Account {
  /** Same format as Game.account */
  id: string
  platform: Platform
  username: string
  lastSyncedAt: number
}
