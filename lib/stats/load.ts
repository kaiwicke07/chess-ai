import { positionKey } from "@/lib/chess/positionKey"
import { replayMoves } from "@/lib/chess/positions"
import { db, gamesForAccount } from "@/lib/db/schema"
import { ANALYSIS_DEPTH } from "@/lib/engine/analyzeGame"
import type { PositionEval, ReviewLog } from "@/lib/types"
import { gameStats, type GameStats } from "./gameStats"

export interface AccountStats {
  games: GameStats[]
  /** All of the account's games, analyzed or not, for the coverage note */
  totalGames: number
  reviews: ReviewLog[]
}

/**
 * Gathers what the dashboard needs for one account: per-move stats for every
 * game whose positions are all analyzed, plus the puzzle review log. Called
 * on demand rather than through a live query, so background analysis writing
 * evals doesn't recompute every game's stats after each position.
 */
export async function loadAccountStats(account: string): Promise<AccountStats> {
  const [games, analyses, reviews] = await Promise.all([
    gamesForAccount(account).toArray(),
    db.analyses.toArray(),
    db.reviews.where("reviewedAt").above(0).filter((r) => r.account === account && r.kind === "puzzle").toArray(),
  ])
  const analyzed = new Set(analyses.filter((a) => a.depth >= ANALYSIS_DEPTH).map((a) => a.gameId))

  const stats: GameStats[] = []
  for (const game of games.filter((g) => analyzed.has(g.id))) {
    const positions = replayMoves(game.moves)
    const evals = await db.evals.bulkGet(positions.map((p) => positionKey(p.fen)))
    // A game counts only if every position has an eval at the analysis depth
    if (evals.every((e): e is PositionEval => !!e && e.depth >= ANALYSIS_DEPTH)) {
      stats.push(gameStats(game, positions, evals))
    }
  }
  return { games: stats, totalGames: games.length, reviews }
}
