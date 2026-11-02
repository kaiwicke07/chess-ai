import { positionKey } from "@/lib/chess/positionKey"
import { replayMoves } from "@/lib/chess/positions"
import { db } from "@/lib/db/schema"
import type { PositionEval } from "@/lib/types"
import { ANALYSIS_DEPTH, evaluatePosition } from "./analyzeGame"
import { AbortError, Engine } from "./engine"

export interface QueueSnapshot {
  /** Game being analyzed right now */
  current: { gameId: string; done: number; total: number } | null
  /** Games waiting, in order */
  pending: string[]
  error: string | null
}

const IDLE: QueueSnapshot = { current: null, pending: [], error: null }

/**
 * Analyzes games one at a time in the background with a single engine.
 * Every finished position is written to IndexedDB immediately, so pages
 * reading evals update live, and an interrupted game resumes where it stopped.
 * React components subscribe through useSyncExternalStore (see useAnalysisQueue).
 */
class AnalysisQueue {
  private engine: Engine | null = null
  private pending: string[] = []
  private current: QueueSnapshot["current"] = null
  private controller: AbortController | null = null
  private error: string | null = null
  private running = false
  private snapshot: QueueSnapshot = IDLE
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  private emit() {
    // A new object only when something changed, as useSyncExternalStore requires
    this.snapshot = { current: this.current && { ...this.current }, pending: [...this.pending], error: this.error }
    for (const listener of this.listeners) listener()
  }

  /** Adds games to the back of the queue, skipping ones already queued or running. */
  enqueue(gameIds: string[]) {
    for (const id of gameIds) {
      if (id !== this.current?.gameId && !this.pending.includes(id)) this.pending.push(id)
    }
    this.emit()
    void this.run()
  }

  /**
   * Analyzes this game next, pausing whatever is running. The paused game goes
   * back to the front of the queue and resumes from its cached positions.
   */
  prioritize(gameId: string) {
    if (this.current?.gameId === gameId) return
    this.pending = [gameId, ...this.pending.filter((id) => id !== gameId)]
    if (this.current) {
      this.pending.splice(1, 0, this.current.gameId)
      this.controller?.abort()
    }
    this.emit()
    void this.run()
  }

  /** Drops everything waiting and stops the current game. */
  clear() {
    this.pending = []
    this.controller?.abort()
    this.emit()
  }

  private async run() {
    if (this.running) return
    this.running = true
    this.error = null
    try {
      while (this.pending.length) {
        const gameId = this.pending.shift()!
        // Mark it current right away, so a duplicate request arriving while the
        // game loads from IndexedDB is recognized instead of queued again
        this.current = { gameId, done: 0, total: 0 }
        this.controller = new AbortController()
        try {
          await this.analyzeGame(gameId, this.controller.signal)
        } catch (error) {
          if (!(error instanceof AbortError)) {
            this.error = error instanceof Error ? error.message : "Analysis failed."
            this.pending = []
          }
        }
        this.current = null
        this.emit()
      }
    } finally {
      this.running = false
      this.controller = null
    }
  }

  private async analyzeGame(gameId: string, signal: AbortSignal) {
    const game = await db.games.get(gameId)
    if (!game) return
    // Already complete (it can be queued from a list that was rendered earlier)
    const analysis = await db.analyses.get(gameId)
    if (analysis && analysis.depth >= ANALYSIS_DEPTH) return
    const fens = replayMoves(game.moves).map((position) => position.fen)
    const keys = fens.map(positionKey)

    // Reuse cached evals (from this game earlier, or the same position in other games)
    const cached = await db.evals.bulkGet(keys)
    const known = new Map<string, PositionEval>()
    cached.forEach((entry) => entry && entry.depth >= ANALYSIS_DEPTH && known.set(entry.key, entry))

    this.current = { gameId, done: 0, total: fens.length }
    this.emit()

    this.engine ??= new Engine()
    await this.engine.newGame()

    for (let i = 0; i < fens.length; i++) {
      if (!known.has(keys[i])) {
        const result = await evaluatePosition(this.engine, fens[i], ANALYSIS_DEPTH, signal)
        known.set(result.key, result)
        await db.evals.put(result)
      }
      this.current = { gameId, done: i + 1, total: fens.length }
      this.emit()
    }

    await db.analyses.put({ gameId, depth: ANALYSIS_DEPTH, completedAt: Date.now() })
  }
}

// Workers only exist in the browser; during server rendering there is no queue
export const analysisQueue = typeof window === "undefined" ? null : new AnalysisQueue()

export const IDLE_SNAPSHOT = IDLE
