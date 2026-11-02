import { Chess } from "chess.js"

import type { Puzzle, SolveOutcome } from "@/lib/types"

export type { SolveOutcome }

export interface SolveState {
  /** How many solution moves are on the board; the next user move is solution[step] */
  step: number
  status: "playing" | "solved" | "failed"
  /** Wrong moves tried so far */
  mistakes: number
  hintUsed: boolean
}

export const START: SolveState = { step: 0, status: "playing", mistakes: 0, hintUsed: false }

/**
 * How the attempt went, graded by lib/srs/grading.ts:
 * clean (no help), hinted (used a hint), retried (a wrong move first), failed.
 */
export function outcomeOf(state: SolveState): SolveOutcome | null {
  if (state.status === "playing") return null
  if (state.status === "failed") return "failed"
  if (state.mistakes) return "retried"
  return state.hintUsed ? "hinted" : "clean"
}

/** The position after the first `step` solution moves. */
export function fenAt(puzzle: Puzzle, step: number): string {
  const chess = new Chess(puzzle.fen)
  for (const uci of puzzle.solution.slice(0, step)) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  }
  return chess.fen()
}

/**
 * Judges a user move. Returns the solution move to play (which can differ
 * from the input only in promotion piece), or null if the move is wrong.
 * Any move that gives checkmate is accepted even if it isn't the stored one.
 */
export function checkMove(puzzle: Puzzle, step: number, uci: string): string | null {
  const expected = puzzle.solution[step]
  if (!expected) return null
  if (uci === expected) return expected
  // The board always promotes to a queen; accept it for an underpromotion too
  if (expected.length === 5 && uci.slice(0, 4) === expected.slice(0, 4)) return expected

  const chess = new Chess(fenAt(puzzle, step))
  try {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  } catch {
    return null
  }
  return chess.isCheckmate() ? uci : null
}

/**
 * Applies a user move. A correct move advances one step (the caller then plays
 * the opponent's reply with `advance`); a mating alternative ends the puzzle.
 */
export function userMove(state: SolveState, puzzle: Puzzle, uci: string): { state: SolveState; played: string | null } {
  if (state.status !== "playing") return { state, played: null }
  const played = checkMove(puzzle, state.step, uci)
  if (!played) return { state: { ...state, mistakes: state.mistakes + 1 }, played: null }

  const matedEarly = played !== puzzle.solution[state.step]
  const step = state.step + 1
  const solved = matedEarly || step >= puzzle.solution.length
  return { state: { ...state, step, status: solved ? "solved" : "playing" }, played }
}

/** Plays the opponent's reply from the solution. */
export function advance(state: SolveState): SolveState {
  return { ...state, step: state.step + 1 }
}

/** Is it the opponent's turn to reply (an odd step that isn't the end)? */
export function awaitingReply(state: SolveState, puzzle: Puzzle): boolean {
  return state.status === "playing" && state.step % 2 === 1 && state.step < puzzle.solution.length
}
