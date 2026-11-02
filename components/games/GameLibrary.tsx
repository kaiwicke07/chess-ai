"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { RefreshCw } from "lucide-react"

import { AnalysisProgress } from "@/components/games/AnalysisProgress"
import { GameCard, type AnalysisStatus } from "@/components/games/GameCard"
import { GameListSkeleton } from "@/components/games/GameListSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { db, gamesForAccount } from "@/lib/db/schema"
import { ANALYSIS_DEPTH } from "@/lib/engine/analyzeGame"
import { useAnalysisQueue } from "@/lib/engine/useAnalysisQueue"
import { formatRelative } from "@/lib/format"
import { accountId, PLATFORM_LABELS, SourceError } from "@/lib/sources/normalize"
import { syncAccount } from "@/lib/sources/sync"
import type { Platform } from "@/lib/types"

type SyncState =
  | { status: "idle" }
  | { status: "syncing"; imported: number }
  | { status: "done"; imported: number }
  | { status: "error"; message: string }

/**
 * An account's game list. Reads straight from IndexedDB via useLiveQuery,
 * which re-renders whenever the stored games change, including mid-sync.
 */
export function GameLibrary({ platform, username }: { platform: Platform; username: string }) {
  const id = accountId(platform, username)
  const games = useLiveQuery(() => gamesForAccount(id).toArray(), [id])
  // undefined while loading, null once we know this account was never synced
  const account = useLiveQuery(async () => (await db.accounts.get(id)) ?? null, [id])
  const [sync, setSync] = useState<SyncState>({ status: "idle" })
  const analyzed = useLiveQuery(
    async () => new Set((await db.analyses.toArray()).filter((a) => a.depth >= ANALYSIS_DEPTH).map((a) => a.gameId)),
    [],
  )
  const queue = useAnalysisQueue()

  // State is only set from callbacks, never synchronously, so the effect below can call this
  const runSync = useCallback(() => {
    syncAccount(platform, username, (n) => setSync({ status: "syncing", imported: n })).then(
      (imported) => setSync({ status: "done", imported }),
      (error: unknown) => {
        const message = error instanceof SourceError ? error.message : "Something went wrong while syncing."
        setSync({ status: "error", message })
      },
    )
  }, [platform, username])

  // First visit to an account: import without waiting for a click
  const neverSynced = account === null
  useEffect(() => {
    if (neverSynced) runSync()
  }, [neverSynced, runSync])

  if (games === undefined || account === undefined || analyzed === undefined) return <GameListSkeleton />

  // A never-synced account counts as syncing: the effect above has just started it
  const syncing = sync.status === "syncing" || (neverSynced && sync.status === "idle")
  const me = games[0] && (games[0].userColor === "white" ? games[0].white : games[0].black)
  const record = { win: 0, draw: 0, loss: 0 }
  for (const game of games) record[game.result]++
  const gameIds = games.map((game) => game.id)
  const unanalyzedIds = gameIds.filter((gameId) => !analyzed.has(gameId))
  const statusOf = (gameId: string): AnalysisStatus | null =>
    analyzed.has(gameId)
      ? "analyzed"
      : queue.current?.gameId === gameId
        ? "analyzing"
        : queue.pending.includes(gameId)
          ? "queued"
          : null

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{me?.name ?? username}</h1>
            <Badge variant="outline">{PLATFORM_LABELS[platform]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {games.length} {games.length === 1 ? "game" : "games"}
            {games.length > 0 && (
              <>
                {" · "}
                <span className="text-best">{record.win}W</span>{" "}
                <span>{record.draw}D</span>{" "}
                <span className="text-blunder">{record.loss}L</span>
              </>
            )}
            {account && <> · synced {formatRelative(account.lastSyncedAt)}</>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* With no games listed, errors get the larger EmptyState treatment instead */}
          <SyncStatus sync={sync} showError={games.length > 0} />
          <Button
            variant="outline"
            onClick={() => {
              setSync({ status: "syncing", imported: 0 })
              runSync()
            }}
            disabled={syncing}
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} aria-hidden />
            {syncing ? "Syncing" : "Sync"}
          </Button>
        </div>
      </header>

      {games.length > 0 && <AnalysisProgress gameIds={gameIds} unanalyzedIds={unanalyzedIds} queue={queue} />}

      {games.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {games.map((game) => (
            <GameCard key={game.id} game={game} analysis={statusOf(game.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState sync={sync} platform={platform} synced={account !== null} />
      )}
    </>
  )
}

function SyncStatus({ sync, showError }: { sync: SyncState; showError: boolean }) {
  if (sync.status === "error") {
    return showError ? (
      <span role="alert" className="text-sm text-destructive">
        {sync.message}
      </span>
    ) : null
  }

  let text: string | null = null
  if (sync.status === "syncing") text = sync.imported ? `Imported ${sync.imported}…` : "Contacting server…"
  if (sync.status === "done") text = sync.imported ? `${sync.imported} new` : "Up to date"
  if (!text) return null
  return (
    <span role="status" className="text-sm text-muted-foreground">
      {text}
    </span>
  )
}

function EmptyState({ sync, platform, synced }: { sync: SyncState; platform: Platform; synced: boolean }) {
  if (sync.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <p className="text-destructive">{sync.message}</p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Try another username
        </Link>
      </div>
    )
  }

  // A never-synced account is about to start importing; don't flash "no games"
  if (sync.status === "syncing" || (sync.status === "idle" && !synced)) return <GameListSkeleton header={false} />

  return (
    <div className="rounded-xl p-6 text-muted-foreground ring-1 ring-foreground/10">
      No standard timed games found on {PLATFORM_LABELS[platform]}. Correspondence, daily and variant games are
      skipped.
    </div>
  )
}
