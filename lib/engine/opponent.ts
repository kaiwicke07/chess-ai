import { Engine } from "./engine"

export interface Strength {
  id: string
  label: string
  /** Stockfish's own Elo limit (1320–3190 in this build), or null below that */
  elo: number | null
  /** Skill Level 0–20, used when elo is null */
  skill: number
  /** Thinking time per move */
  movetimeMs: number
}

/**
 * Opponent strengths. Stockfish calibrates UCI_Elo at a minute per game, so
 * with a fraction of a second per move these labels are a rough guide, and
 * anything below 1320 uses the coarser Skill Level instead.
 */
export const STRENGTHS: Strength[] = [
  { id: "beginner", label: "Beginner", elo: null, skill: 0, movetimeMs: 300 },
  { id: "1400", label: "~1400", elo: 1400, skill: 20, movetimeMs: 500 },
  { id: "1700", label: "~1700", elo: 1700, skill: 20, movetimeMs: 500 },
  { id: "2000", label: "~2000", elo: 2000, skill: 20, movetimeMs: 500 },
  { id: "2400", label: "~2400", elo: 2400, skill: 20, movetimeMs: 700 },
  { id: "max", label: "Full strength", elo: null, skill: 20, movetimeMs: 1000 },
]

/**
 * A Stockfish instance that plays against the user. It's separate from the
 * analysis engine, so background analysis keeps running and its strength
 * settings never leak into the evals.
 */
export class Opponent {
  private engine = new Engine()

  async configure(strength: Strength) {
    await this.engine.newGame()
    await this.engine.setOption("UCI_LimitStrength", strength.elo !== null)
    if (strength.elo !== null) await this.engine.setOption("UCI_Elo", strength.elo)
    await this.engine.setOption("Skill Level", strength.skill)
  }

  /** The opponent's move in `fen`, as UCI; null if there is none (game over). */
  move(fen: string, strength: Strength): Promise<string | null> {
    return this.engine.bestMove(fen, strength.movetimeMs)
  }

  dispose() {
    this.engine.terminate()
  }
}
