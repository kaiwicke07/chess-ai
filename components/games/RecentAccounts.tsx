"use client"

import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"

import { db } from "@/lib/db/schema"
import { PLATFORM_LABELS } from "@/lib/sources/normalize"

/** Accounts already imported in this browser, most recently synced first. */
export function RecentAccounts() {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  if (!accounts?.length) return null

  const sorted = [...accounts].sort((a, b) => b.lastSyncedAt - a.lastSyncedAt)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Continue:</span>
      {sorted.map((account) => (
        <Link
          key={account.id}
          href={`/u/${account.platform}/${account.username}`}
          className="rounded-md px-2 py-1 ring-1 ring-foreground/10 hover:bg-muted"
        >
          {account.username}
          <span className="text-muted-foreground"> · {PLATFORM_LABELS[account.platform]}</span>
        </Link>
      ))}
    </div>
  )
}
