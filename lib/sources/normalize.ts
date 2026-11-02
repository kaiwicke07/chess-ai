import type { Platform } from "@/lib/types"

export const PLATFORM_LABELS: Record<Platform, string> = {
  lichess: "Lichess",
  chesscom: "Chess.com",
}

export function isPlatform(value: string): value is Platform {
  return value === "lichess" || value === "chesscom"
}

// Loose check covering both sites' rules. Whether the account exists
// is answered by the platform's API.
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,25}$/

/** Usernames are case-insensitive on both sites, so keys use the lowercase form. */
export function accountId(platform: Platform, username: string): string {
  return `${platform}:${username.toLowerCase()}`
}

/** Below this many plies there is nothing worth analyzing (aborted or instant resignations). */
export const MIN_PLIES = 2

/** First sync of an account imports at most this many recent games. */
export const INITIAL_IMPORT_LIMIT = 100

export type SourceErrorKind = "not_found" | "rate_limited" | "network" | "bad_response"

export class SourceError extends Error {
  constructor(
    public kind: SourceErrorKind,
    message: string,
  ) {
    super(message)
    this.name = "SourceError"
  }
}

/** Maps an HTTP failure from either site to a SourceError the UI can explain. */
export function errorForStatus(status: number, platform: Platform, username: string): SourceError {
  const site = PLATFORM_LABELS[platform]
  if (status === 404) return new SourceError("not_found", `No ${site} account named “${username}”.`)
  if (status === 429)
    return new SourceError("rate_limited", `${site} is rate-limiting requests. Wait a minute and sync again.`)
  return new SourceError("bad_response", `${site} returned an unexpected error (HTTP ${status}).`)
}

/** fetch() that turns a network failure into a SourceError. */
export async function fetchFromSource(url: string, init: RequestInit, platform: Platform): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new SourceError("network", `Couldn't reach ${PLATFORM_LABELS[platform]}. Check your connection.`)
  }
}
