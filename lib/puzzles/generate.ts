import { Chess } from "chess.js"

import type { MoveAssessment } from "@/lib/analysis/classify"
import { winPercentFor } from "@/lib/analysis/winProbability"
import { materialBalance } from "@/lib/chess/material"
import type { Position } from "@/lib/chess/positions"
import { toWhiteEval } from "@/lib/engine/analyzeGame"
import type { Engine } from "@/lib/engine/engine"
import type { Color, Game, Puzzle } from "@/lib/types"
import { tagThemes } from "./themes"

/** Bump to regenerate every game's puzzles after changing the rules below. */
export const PUZZLE_VERSION = 1

/** Deeper than game analysis: a puzzle's answer has to be right. */
export const PUZZLE_DEPTH = 18

/** The best move must beat the second best by this many win-% points. */
export const UNIQUENESS_MARGIN = 15

const MAX_USER_MOVES = 3

/** Keep going past the first move only when the user is clearly winning. */
const EXTEND_ABOVE_WIN = 70

export interface Candidate {
  ply: number
  fen: string
  color: Color
  played: Puzzle["played"]
  previousMove: Puzzle["previousMove"]
}

/** Positions right before the user's own mistakes and blunders. */
export function findCandidates(game: Game, positions: Position[], assessments: (MoveAssessment | null)[]): Candidate[] {
  const candidates: Candidate[] = []
  for (const a of assessments) {
    if (!a || a.color !== game.userColor || (a.judgement !== "mistake" && a.judgement !== "blunder")) continue
    const move = positions[a.ply].lastMove!
    const before = positions[a.ply - 1]
    candidates.push({
      ply: a.ply - 1,
      fen: before.fen,
      color: a.color,
      played: { uci: move.uci, san: move.san, judgement: a.judgement },
      previousMove: before.lastMove && { from: before.lastMove.from, to: before.lastMove.to },
    })
  }
  return candidates
}

/**
 * Searches for a solution line, or null if the position doesn't make a fair
 * puzzle. With MultiPV 2 the engine returns its two best moves; the position
 * only counts if the best is clearly better than the second (or is the only
 * mate), so every puzzle has one real answer. Positions already won or lost
 * drop out by themselves: both moves score near 100 or near 0.
 *
 * The line continues with the opponent's best reply and the user's next move
 * while each user move is still unique, up to 3 user moves, but only while the
 * user is clearly winning and hasn't cashed in material yet. A defensive "only
 * move" stays a one-move puzzle.
 */
export async function buildSolution(
  engine: Pick<Engine, "analyze">,
  fen: string,
  color: Color,
  signal?: AbortSignal,
): Promise<{ moves: string[]; win: number } | null> {
  const chess = new Chess(fen)
  const start = materialBalance(fen, color)
  const solution: string[] = []
  // The user's win chance after the first best move, for theme tagging
  let firstWin = 50

  for (let i = 0; i < MAX_USER_MOVES; i++) {
    const [top, second] = await engine.analyze(chess.fen(), { depth: PUZZLE_DEPTH, multiPv: 2, signal })
    if (!top?.pv[0]) break

    const whiteToMove = chess.turn() === "w"
    const topMates = top.score.type === "mate" && top.score.value > 0
    const topWin = winPercentFor(toWhiteEval(top, whiteToMove), color)
    if (second) {
      const secondMates = second.score.type === "mate" && second.score.value > 0
      const gap = topWin - winPercentFor(toWhiteEval(second, whiteToMove), color)
      if (topMates ? secondMates : gap < UNIQUENESS_MARGIN) break
    } else if (i === 0) {
      return null // the only legal move isn't a puzzle
    }
    if (i === 0) firstWin = topWin

    solution.push(top.pv[0])
    play(chess, top.pv[0])
    if (chess.isGameOver()) break

    const winning = topMates || topWin >= EXTEND_ABOVE_WIN
    const cashedIn = !topMates && materialBalance(chess.fen(), color) - start >= 2
    const reply = top.pv[1]
    if (!winning || cashedIn || !reply) break

    solution.push(reply)
    play(chess, reply)
  }

  // Always finish on the user's move
  if (solution.length % 2 === 0) solution.pop()
  return solution.length ? { moves: solution, win: firstWin } : null
}

function play(chess: Chess, uci: string) {
  chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
}

/** Turns a candidate into a stored puzzle, or null if it doesn't qualify. */
export async function puzzleFromCandidate(
  engine: Pick<Engine, "analyze">,
  game: Game,
  candidate: Candidate,
  signal?: AbortSignal,
): Promise<Puzzle | null> {
  const found = await buildSolution(engine, candidate.fen, candidate.color, signal)
  // A deeper look sometimes rates the game move best after all
  if (!found || found.moves[0] === candidate.played.uci) return null

  return {
    id: `${game.id}:${candidate.ply}`,
    gameId: game.id,
    account: game.account,
    ply: candidate.ply,
    fen: candidate.fen,
    color: candidate.color,
    solution: found.moves,
    ...tagThemes(candidate.fen, found.moves, candidate.color, found.win),
    previousMove: candidate.previousMove,
    played: candidate.played,
    createdAt: Date.now(),
  }
}
