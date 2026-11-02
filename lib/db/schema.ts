import Dexie, { type EntityTable } from "dexie"

import type { Account, Game } from "@/lib/types"

/**
 * All user data lives in this IndexedDB database. Each schema change gets a
 * new version number; Dexie migrates existing browsers forward automatically.
 */
class TrainerDB extends Dexie {
  games!: EntityTable<Game, "id">
  accounts!: EntityTable<Account, "id">

  constructor() {
    super("chess-trainer")
    // Only indexed fields are listed; every other field is still stored.
    // [account+playedAt] lets us read one account's games in date order.
    this.version(1).stores({
      games: "id, [account+playedAt]",
      accounts: "id",
    })
  }
}

export const db = new TrainerDB()

/** One account's games, newest first. */
export function gamesForAccount(account: string) {
  return db.games
    .where("[account+playedAt]")
    .between([account, Dexie.minKey], [account, Dexie.maxKey])
    .reverse()
}
