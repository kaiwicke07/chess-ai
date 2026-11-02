import { db, gamesForAccount } from "@/lib/db/schema"
import type { Platform } from "@/lib/types"
import { fetchChessComGames } from "./chesscom"
import { fetchLichessGames } from "./lichess"
import { accountId, INITIAL_IMPORT_LIMIT } from "./normalize"

const FETCHERS = {
  lichess: fetchLichessGames,
  chesscom: fetchChessComGames,
} satisfies Record<Platform, unknown>

// One sync per account at a time, even if the page mounts twice (React Strict Mode)
const inFlight = new Map<string, Promise<number>>()

/**
 * Imports games played since the newest one already stored. The first sync
 * of an account takes the most recent INITIAL_IMPORT_LIMIT games instead.
 * Writes are upserts keyed by game id, so overlapping fetches never duplicate.
 * Resolves to the number of games written.
 */
export function syncAccount(
  platform: Platform,
  username: string,
  onProgress?: (imported: number) => void,
): Promise<number> {
  const id = accountId(platform, username)
  const running = inFlight.get(id)
  if (running) return running

  const sync = (async () => {
    const newest = await gamesForAccount(id).first()
    const games = FETCHERS[platform](
      // `since` is inclusive on both sites, so start just after the newest stored game
      newest ? { username, since: newest.playedAt + 1 } : { username, max: INITIAL_IMPORT_LIMIT },
    )

    let imported = 0
    for await (const batch of games) {
      await db.games.bulkPut(batch)
      imported += batch.length
      onProgress?.(imported)
    }

    await db.accounts.put({ id, platform, username: username.toLowerCase(), lastSyncedAt: Date.now() })
    return imported
  })()

  inFlight.set(id, sync)
  return sync.finally(() => inFlight.delete(id))
}
