import Dexie, { type EntityTable } from "dexie"

import type { Account, Game, GameAnalysis, PositionEval, Puzzle, ReviewCard, ReviewLog } from "@/lib/types"

/**
 * All user data lives in this IndexedDB database. Each schema change gets a
 * new version number; Dexie migrates existing browsers forward automatically.
 */
class TrainerDB extends Dexie {
  games!: EntityTable<Game, "id">
  accounts!: EntityTable<Account, "id">
  evals!: EntityTable<PositionEval, "key">
  analyses!: EntityTable<GameAnalysis, "gameId">
  puzzles!: EntityTable<Puzzle, "id">
  cards!: EntityTable<ReviewCard, "id">
  reviews!: EntityTable<ReviewLog, "id">

  constructor() {
    super("chess-trainer")
    // Only indexed fields are listed; every other field is still stored.
    // [account+playedAt] lets us read one account's games in date order.
    this.version(1).stores({
      games: "id, [account+playedAt]",
      accounts: "id",
    })
    // v2: engine results. Evals are cached per position, not per game, so a
    // position reached in many games (every opening) is analyzed only once.
    this.version(2).stores({
      evals: "key",
      analyses: "gameId",
    })
    // v3: puzzles generated from the user's mistakes
    this.version(3).stores({
      puzzles: "id, gameId, account, createdAt",
    })
    // v4: spaced repetition. cards hold the schedule (one per puzzle, indexed
    // by due date); reviews are an append-only log of every attempt.
    this.version(4).stores({
      cards: "id, due, kind, refId, createdAt",
      reviews: "++id, cardId, refId, reviewedAt",
    })
  }
}

export const db = new TrainerDB()

/**
 * Fully processed: every position analyzed at `depth` and the game scanned
 * for puzzles by the current generator. Older records count as unfinished,
 * so games analyzed before a generator change get rescanned.
 */
export function isComplete(analysis: GameAnalysis | undefined, depth: number, puzzleVersion: number): boolean {
  return !!analysis && analysis.depth >= depth && analysis.puzzleVersion === puzzleVersion
}

/** One account's games, newest first. */
export function gamesForAccount(account: string) {
  return db.games
    .where("[account+playedAt]")
    .between([account, Dexie.minKey], [account, Dexie.maxKey])
    .reverse()
}
