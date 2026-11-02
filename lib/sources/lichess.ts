import { z } from "zod"

import type { Color, Game, Player, Speed, Termination } from "@/lib/types"
import { readNdjson } from "./ndjson"
import { accountId, errorForStatus, fetchFromSource, MIN_PLIES } from "./normalize"

// Only the fields we use; Zod drops the rest. Anything that fails is skipped, not fatal.
const lichessPlayer = z.object({
  user: z.object({ name: z.string(), id: z.string() }).optional(),
  rating: z.number().optional(),
  aiLevel: z.number().optional(),
})

const lichessGame = z.object({
  id: z.string(),
  rated: z.boolean(),
  variant: z.string(),
  speed: z.string(),
  createdAt: z.number(),
  status: z.string(),
  players: z.object({ white: lichessPlayer, black: lichessPlayer }),
  winner: z.enum(["white", "black"]).optional(),
  opening: z.object({ eco: z.string(), name: z.string() }).optional(),
  moves: z.string(),
  clocks: z.array(z.number()).optional(),
  clock: z.object({ initial: z.number(), increment: z.number() }).optional(),
})

const SPEEDS: Speed[] = ["bullet", "blitz", "rapid", "classical"]

const TERMINATIONS: Record<string, Termination> = {
  mate: "checkmate",
  resign: "resignation",
  outoftime: "timeout",
  timeout: "abandoned", // Lichess uses "timeout" when a player leaves the game
  draw: "draw",
  stalemate: "draw",
}

function toPlayer(player: z.infer<typeof lichessPlayer>): Player {
  const name = player.user?.name ?? (player.aiLevel ? `Stockfish level ${player.aiLevel}` : "Anonymous")
  return { name, rating: player.rating ?? null }
}

/** Converts one NDJSON record to a Game, or null if it isn't a standard, finished, timed game. */
export function normalizeLichessGame(raw: unknown, username: string): Game | null {
  const parsed = lichessGame.safeParse(raw)
  if (!parsed.success) return null
  const g = parsed.data

  const speed = SPEEDS.find((s) => s === g.speed)
  if (g.variant !== "standard" || !speed || !g.clock) return null

  const moves = g.moves.split(" ").filter(Boolean)
  if (moves.length < MIN_PLIES) return null

  const name = username.toLowerCase()
  let userColor: Color
  if (g.players.white.user?.id === name) userColor = "white"
  else if (g.players.black.user?.id === name) userColor = "black"
  else return null

  // Centiseconds. Lichess can append one extra entry when a game ends by agreement.
  const clocks =
    g.clocks && g.clocks.length >= moves.length
      ? g.clocks.slice(0, moves.length).map((cs) => cs * 10)
      : null

  return {
    id: `lichess:${g.id}`,
    platform: "lichess",
    sourceId: g.id,
    account: accountId("lichess", username),
    url: `https://lichess.org/${g.id}${userColor === "black" ? "/black" : ""}`,
    playedAt: g.createdAt,
    rated: g.rated,
    speed,
    timeControl: { initial: g.clock.initial, increment: g.clock.increment },
    white: toPlayer(g.players.white),
    black: toPlayer(g.players.black),
    userColor,
    result: !g.winner ? "draw" : g.winner === userColor ? "win" : "loss",
    termination: TERMINATIONS[g.status] ?? "other",
    opening: { eco: g.opening?.eco ?? null, name: g.opening?.name ?? null },
    moves,
    clocks,
  }
}

const BATCH_SIZE = 10

/**
 * Streams a user's games, newest first, in small batches for progress updates.
 * With `since`, fetches everything after it; otherwise the newest `max` games.
 */
export async function* fetchLichessGames(options: {
  username: string
  since?: number
  max?: number
}): AsyncGenerator<Game[]> {
  const params = new URLSearchParams({
    perfType: SPEEDS.join(","),
    clocks: "true",
    opening: "true",
    moves: "true",
  })
  if (options.since) params.set("since", String(options.since))
  if (options.max) params.set("max", String(options.max))

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(options.username)}?${params}`
  const response = await fetchFromSource(url, { headers: { Accept: "application/x-ndjson" } }, "lichess")
  if (!response.ok) throw errorForStatus(response.status, "lichess", options.username)

  let batch: Game[] = []
  for await (const raw of readNdjson(response)) {
    const game = normalizeLichessGame(raw, options.username)
    if (game) batch.push(game)
    if (batch.length >= BATCH_SIZE) {
      yield batch
      batch = []
    }
  }
  if (batch.length) yield batch
}
