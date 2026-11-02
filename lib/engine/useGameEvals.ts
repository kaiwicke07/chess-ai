"use client"

import { useEffect, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"

import { positionKey } from "@/lib/chess/positionKey"
import type { Position } from "@/lib/chess/positions"
import { db, isComplete } from "@/lib/db/schema"
import { PUZZLE_VERSION } from "@/lib/puzzles/generate"
import type { PositionEval } from "@/lib/types"
import { ANALYSIS_DEPTH } from "./analyzeGame"
import { analysisQueue } from "./queue"

/**
 * Evals for every position of a game, in ply order (undefined until a position
 * is analyzed). Re-renders as the background queue writes new evals. Asks the
 * queue to process this game first unless it is already complete (evals and
 * puzzle scan).
 */
export function useGameEvals(gameId: string, positions: Position[]): (PositionEval | undefined)[] | undefined {
  const keys = useMemo(() => positions.map((p) => positionKey(p.fen)), [positions])
  const evals = useLiveQuery(() => db.evals.bulkGet(keys), [keys])

  useEffect(() => {
    void db.analyses.get(gameId).then((analysis) => {
      if (!isComplete(analysis, ANALYSIS_DEPTH, PUZZLE_VERSION)) analysisQueue?.prioritize(gameId)
    })
  }, [gameId])

  // An eval cached at a lower depth by some future setting doesn't count
  return evals?.map((e) => (e && e.depth >= ANALYSIS_DEPTH ? e : undefined))
}
