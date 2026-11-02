import { Chess } from "chess.js"

import { positionKey } from "@/lib/chess/positionKey"
import { numberMoves } from "@/lib/chess/san"
import type { Color, Game, Result } from "@/lib/types"

/** Opening depth covered: 20 plies is move 10 for both sides. */
export const OPENING_PLIES = 20

export interface TreeMove {
  uci: string
  san: string
  /** Times this move was played from the node in the user's games */
  count: number
  /** Key of the position the move leads to */
  next: string
  /** Final results of those games, from the user's side */
  results: Record<Result, number>
}

export interface OpeningNode {
  key: string
  /** A full FEN for the position (move counters from the first game that reached it) */
  fen: string
  toMove: Color
  /** Games that reached this position (a game counts once even if it repeats it) */
  games: number
  /** Moves played from here, by whoever was to move */
  moves: Map<string, TreeMove>
  /** UCI moves from the start along the shortest route that reached this node */
  path: string[]
}

export interface OpeningTree {
  color: Color
  root: string
  nodes: Map<string, OpeningNode>
}

/**
 * Merges the user's games with `color` into one tree of positions. Keys come
 * from positionKey, so a transposition (1.d4 Nf6 2.c4 e6 vs 1.c4 e6 2.d4 Nf6)
 * lands on the same node and its statistics add up.
 */
export function buildTree(games: Game[], color: Color, plies = OPENING_PLIES): OpeningTree {
  const nodes = new Map<string, OpeningNode>()
  const start = new Chess()
  const root = positionKey(start.fen())

  const nodeFor = (chess: Chess, path: string[]) => {
    const key = positionKey(chess.fen())
    let node = nodes.get(key)
    if (!node) {
      node = { key, fen: chess.fen(), toMove: chess.turn() === "w" ? "white" : "black", games: 0, moves: new Map(), path }
      nodes.set(key, node)
    } else if (path.length < node.path.length) {
      node.path = path
    }
    return node
  }

  for (const game of games) {
    if (game.userColor !== color) continue
    const chess = new Chess()
    const seen = new Set<string>()
    const path: string[] = []

    for (const san of game.moves.slice(0, plies)) {
      const node = nodeFor(chess, [...path])
      if (!seen.has(node.key)) {
        node.games++
        seen.add(node.key)
      }
      let move
      try {
        move = chess.move(san)
      } catch {
        break
      }
      const entry = node.moves.get(move.lan) ?? {
        uci: move.lan,
        san: move.san,
        count: 0,
        next: positionKey(move.after),
        results: { win: 0, draw: 0, loss: 0 },
      }
      entry.count++
      entry.results[game.result]++
      node.moves.set(move.lan, entry)
      path.push(move.lan)
    }
    // Count the final position too, so the deepest node reached has a game count
    const last = nodeFor(chess, [...path])
    if (!seen.has(last.key)) last.games++
  }

  return { color, root, nodes }
}

/** Each step of a UCI path from the start, as a numbered SAN label and the key it leads to. */
export function pathSteps(path: string[]): { label: string; key: string }[] {
  const chess = new Chess()
  const steps: { san: string; key: string }[] = []
  for (const uci of path) {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    steps.push({ san: move.san, key: positionKey(chess.fen()) })
  }
  const labels = numberMoves(new Chess().fen(), steps.map((s) => s.san))
  return steps.map((step, i) => ({ label: labels[i], key: step.key }))
}

/** Moves out of a node, most played first. */
export function movesByCount(node: OpeningNode): TreeMove[] {
  return [...node.moves.values()].sort((a, b) => b.count - a.count)
}
