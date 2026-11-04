import { Chess } from "chess.js"

import { Engine } from "@/lib/engine/engine"
import { pickSampledMove, type Bot } from "./bots"

/**
 * A bot's own Stockfish, separate from the analysis engine (as the replay
 * opponent is), so its strength settings never touch the evals and the
 * coach's checks don't queue behind the bot's thinking.
 */
export class BotPlayer {
  private engine = new Engine()

  constructor(private bot: Bot) {}

  async configure() {
    await this.engine.newGame()
    const { style } = this.bot
    await this.engine.setOption("UCI_LimitStrength", style.kind === "elo")
    if (style.kind === "elo") await this.engine.setOption("UCI_Elo", style.elo)
    await this.engine.setOption("Skill Level", 20)
  }

  /** The bot's move in `fen` (UCI), or null when the game is over. */
  async move(fen: string): Promise<string | null> {
    const { style } = this.bot
    if (style.kind === "elo") return this.engine.bestMove(fen, style.movetimeMs)

    const legal = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""))
    if (!legal.length) return null
    const lines = await this.engine.analyze(fen, { depth: style.depth, multiPv: Math.min(style.candidates, legal.length) })
    return pickSampledMove(lines, legal, style, Math.random)
  }

  dispose() {
    this.engine.terminate()
  }
}
