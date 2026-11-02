import { Chess } from "chess.js"

import { positionKey } from "@/lib/chess/positionKey"
import type { Eval, PositionEval } from "@/lib/types"
import type { Engine } from "./engine"
import type { UciInfo } from "./uci"

/** One depth for every game, so evals and stats are comparable across games. */
export const ANALYSIS_DEPTH = 14

/** Enough of the engine's line to explain a move later; the rest is noise. */
const PV_LENGTH = 12

/** Converts the engine's side-to-move score to white's point of view. */
export function toWhiteEval(info: UciInfo, whiteToMove: boolean): Eval {
  const sign = whiteToMove ? 1 : -1
  return info.score.type === "cp"
    ? { kind: "cp", cp: sign * info.score.value }
    : { kind: "mate", moves: sign * info.score.value }
}

/**
 * Finished positions get an exact result without asking the engine, which
 * would only answer "bestmove (none)".
 */
export function terminalEval(fen: string): Eval | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) return { kind: "checkmate", winner: chess.turn() === "w" ? "black" : "white" }
  if (chess.isDraw()) return { kind: "cp", cp: 0 }
  return null
}

/** Evaluates one position at `depth`. */
export async function evaluatePosition(
  engine: Engine,
  fen: string,
  depth: number,
  signal?: AbortSignal,
): Promise<PositionEval> {
  const key = positionKey(fen)
  const terminal = terminalEval(fen)
  if (terminal) return { key, depth, eval: terminal, best: null, pv: [] }

  const [line] = await engine.analyze(fen, { depth, signal })
  if (!line) throw new Error(`Engine returned no line for ${fen}`)
  return {
    key,
    depth,
    eval: toWhiteEval(line, fen.split(" ")[1] === "w"),
    best: line.pv[0] ?? null,
    pv: line.pv.slice(0, PV_LENGTH),
  }
}
