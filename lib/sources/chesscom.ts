import { z } from "@/lib/zod"

import { parsePgnClocks, pgnHeader, pgnMoves } from "@/lib/chess/pgn"
import type { Color, Game, Speed, Termination } from "@/lib/types"
import { accountId, errorForStatus, fetchFromSource, MIN_PLIES, SourceError } from "./normalize"

const STANDARD_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

const chessComPlayer = z.object({
  username: z.string(),
  rating: z.number().optional(),
  result: z.string(),
})

const chessComGame = z.object({
  url: z.string(),
  uuid: z.string(),
  pgn: z.string(),
  time_control: z.string(),
  end_time: z.number(),
  rated: z.boolean(),
  time_class: z.string(),
  rules: z.string(),
  initial_setup: z.string().optional(),
  white: chessComPlayer,
  black: chessComPlayer,
  eco: z.string().optional(),
})

const archivesResponse = z.object({ archives: z.array(z.string()) })
const monthResponse = z.object({ games: z.array(z.unknown()) })

// Chess.com has no "classical"; its long games are all "rapid".
const SPEEDS: Record<string, Speed> = { bullet: "bullet", blitz: "blitz", rapid: "rapid" }

const DRAW_RESULTS = new Set(["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"])

// Keyed by the loser's result code
const TERMINATIONS: Record<string, Termination> = {
  checkmated: "checkmate",
  resigned: "resignation",
  timeout: "timeout",
  abandoned: "abandoned",
}

/** "180+2" → { initial: 180, increment: 2 }. Daily games ("1/86400") return null. */
export function parseTimeControl(value: string): { initial: number; increment: number } | null {
  const match = value.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return null
  return { initial: Number(match[1]), increment: Number(match[2] ?? 0) }
}

/**
 * Chess.com only names openings in a URL slug:
 * ".../openings/Sicilian-Defense-Canal-Attack...10.h3-Bh5" → "Sicilian Defense Canal Attack"
 */
export function openingNameFromUrl(url: string): string | null {
  const slug = url.split("/openings/")[1]
  if (!slug) return null
  const name = slug.split(/\.\.\.|-\d+\./)[0].replace(/-/g, " ").trim()
  return name || null
}

/** Game start from the PGN's UTC headers, falling back to the API's end time. */
function startTime(pgn: string, endTime: number): number {
  const date = pgnHeader(pgn, "UTCDate")
  const time = pgnHeader(pgn, "UTCTime")
  if (date && time) {
    const ms = Date.parse(`${date.replace(/\./g, "-")}T${time}Z`)
    if (!Number.isNaN(ms)) return ms
  }
  return endTime * 1000
}

/** Converts one monthly-archive entry to a Game, or null if it isn't a standard timed game. */
export function normalizeChessComGame(raw: unknown, username: string): Game | null {
  const parsed = chessComGame.safeParse(raw)
  if (!parsed.success) return null
  const g = parsed.data

  const speed = SPEEDS[g.time_class]
  const timeControl = parseTimeControl(g.time_control)
  if (g.rules !== "chess" || !speed || !timeControl) return null
  if (g.initial_setup && g.initial_setup !== STANDARD_START) return null

  const name = username.toLowerCase()
  let userColor: Color
  if (g.white.username.toLowerCase() === name) userColor = "white"
  else if (g.black.username.toLowerCase() === name) userColor = "black"
  else return null

  const moves = pgnMoves(g.pgn)
  if (!moves || moves.length < MIN_PLIES) return null

  const user = userColor === "white" ? g.white : g.black
  const opponent = userColor === "white" ? g.black : g.white
  const isDraw = DRAW_RESULTS.has(user.result)
  const loser = user.result === "win" ? opponent : user

  return {
    id: `chesscom:${g.uuid}`,
    platform: "chesscom",
    sourceId: g.uuid,
    account: accountId("chesscom", username),
    url: g.url,
    playedAt: startTime(g.pgn, g.end_time),
    rated: g.rated,
    speed,
    timeControl,
    white: { name: g.white.username, rating: g.white.rating ?? null },
    black: { name: g.black.username, rating: g.black.rating ?? null },
    userColor,
    result: isDraw ? "draw" : user.result === "win" ? "win" : "loss",
    termination: isDraw ? "draw" : (TERMINATIONS[loser.result] ?? "other"),
    opening: {
      eco: pgnHeader(g.pgn, "ECO"),
      name: g.eco ? openingNameFromUrl(g.eco) : null,
    },
    moves,
    clocks: parsePgnClocks(g.pgn, moves.length),
  }
}

// No custom headers: in the browser they would trigger a CORS preflight.
async function getJson(url: string, username: string): Promise<unknown> {
  const response = await fetchFromSource(url, {}, "chesscom")
  if (!response.ok) throw errorForStatus(response.status, "chesscom", username)
  return response.json()
}

/** "https://api.chess.com/pub/player/x/games/2026/10" → start of that month in UTC, ms */
function archiveMonthStart(url: string): number {
  const [year, month] = url.split("/").slice(-2).map(Number)
  return Date.UTC(year, month - 1, 1)
}

/**
 * Yields a user's games one monthly archive at a time, newest month first.
 * With `since`, stops at the month containing it; otherwise stops after `max` games.
 */
export async function* fetchChessComGames(options: {
  username: string
  since?: number
  max?: number
}): AsyncGenerator<Game[]> {
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(options.username.toLowerCase())}`
  const archives = archivesResponse.safeParse(await getJson(`${base}/games/archives`, options.username))
  if (!archives.success) throw new SourceError("bad_response", "Chess.com sent an unexpected archive list.")

  const sinceMonth = options.since
    ? Date.UTC(new Date(options.since).getUTCFullYear(), new Date(options.since).getUTCMonth(), 1)
    : 0
  let remaining = options.max ?? Infinity

  for (const url of [...archives.data.archives].reverse()) {
    if (archiveMonthStart(url) < sinceMonth || remaining <= 0) break

    const month = monthResponse.safeParse(await getJson(url, options.username))
    if (!month.success) continue

    const games = month.data.games
      .map((raw) => normalizeChessComGame(raw, options.username))
      .filter((game): game is Game => game !== null && (!options.since || game.playedAt >= options.since))
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, remaining)

    remaining -= games.length
    if (games.length) yield games
  }
}
