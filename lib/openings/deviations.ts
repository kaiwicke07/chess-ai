import { winPercentFor } from "@/lib/analysis/winProbability"
import { numberMoves, uciLineToSan } from "@/lib/chess/san"
import type { Color, PositionEval } from "@/lib/types"
import type { OpeningNode, OpeningTree, TreeMove } from "./buildTree"

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** A position counts once you've reached it in at least this many games. */
export const MIN_REACHED = 2

/** A move is a weakness when it costs at least this many win-% points. */
export const MIN_LOSS = 5

/** Moves within this many win-% points of Stockfish's best are fine to play. */
export const ACCEPTABLE_LOSS = 3

export interface MoveQuality extends TreeMove {
  /** Win-% points this move gives up against the position's best play */
  loss: number
}

export interface WeakSpot {
  /** Stable id for the review card: `${account}:${color}:${key}` */
  id: string
  account: string
  color: Color
  node: OpeningNode
  /** SAN of the route to the position, for display */
  pathSan: string[]
  /** Your moves here that cost MIN_LOSS or more, most costly habit first */
  badMoves: MoveQuality[]
  best: { uci: string; san: string }
  /** Moves already known to be fine: the engine's best and your own good ones */
  acceptable: string[]
  /** Σ times played × win-% lost over the bad moves; higher means fix it first */
  score: number
  /** The user's win chance with best play from here */
  win: number
  /** Stockfish's main line from here, numbered SAN (shown after a drill) */
  line: string[]
}

/** How much each move played from `node` costs the mover, when both positions are analyzed. */
export function moveQualities(
  node: OpeningNode,
  evals: Map<string, PositionEval>,
): MoveQuality[] | null {
  const here = evals.get(node.key)
  if (!here) return null
  const before = winPercentFor(here.eval, node.toMove)
  const result: MoveQuality[] = []
  for (const move of node.moves.values()) {
    const next = evals.get(move.next)
    if (!next) continue
    result.push({ ...move, loss: Math.max(0, before - winPercentFor(next.eval, node.toMove)) })
  }
  return result
}

/**
 * Positions where you're to move, have been at least MIN_REACHED times, and
 * have played a move that costs MIN_LOSS or more. Each is ranked by how often
 * you get there and how much the habit costs you, so the top of the list is
 * where fixing one move pays off the most.
 */
export function findWeakSpots(tree: OpeningTree, evals: Map<string, PositionEval>, account: string): WeakSpot[] {
  const spots: WeakSpot[] = []

  for (const node of tree.nodes.values()) {
    if (node.toMove !== tree.color || node.games < MIN_REACHED) continue
    const here = evals.get(node.key)
    const qualities = moveQualities(node, evals)
    if (!here?.best || !qualities) continue

    const badMoves = qualities.filter((m) => m.loss >= MIN_LOSS && m.uci !== here.best).sort((a, b) => b.count * b.loss - a.count * a.loss)
    if (!badMoves.length) continue

    const acceptable = new Set([here.best, ...qualities.filter((m) => m.loss <= ACCEPTABLE_LOSS).map((m) => m.uci)])
    const [bestSan] = uciLineToSan(node.fen, [here.best])
    spots.push({
      id: `${account}:${tree.color}:${node.key}`,
      account,
      color: tree.color,
      node,
      pathSan: uciLineToSan(START_FEN, node.path),
      badMoves,
      best: { uci: here.best, san: bestSan ?? here.best },
      acceptable: [...acceptable],
      // Frequency × cost: every time you played a bad move, what it cost you
      score: badMoves.reduce((sum, m) => sum + m.count * m.loss, 0),
      win: winPercentFor(here.eval, tree.color),
      line: numberMoves(node.fen, uciLineToSan(node.fen, here.pv.slice(0, 6))),
    })
  }

  return spots.sort((a, b) => b.score - a.score)
}
