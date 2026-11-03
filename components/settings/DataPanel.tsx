"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Download, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BackupError, deleteAllData, downloadBackup, exportBackup, parseBackup, restoreBackup } from "@/lib/db/backup"
import { db } from "@/lib/db/schema"

type Status = { tone: "ok" | "error"; text: string } | null

/**
 * Everything lives in this browser, so this is the user's only copy: export
 * it to a file, restore it on another device or after clearing site data,
 * or delete it. Restore and delete ask first, since neither can be undone.
 */
export function DataPanel() {
  const counts = useLiveQuery(async () => ({
    accounts: await db.accounts.count(),
    games: await db.games.count(),
    puzzles: await db.puzzles.count(),
    reviews: await db.reviews.count(),
  }))
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  async function run(task: () => Promise<string>) {
    setBusy(true)
    setStatus(null)
    try {
      setStatus({ tone: "ok", text: await task() })
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof BackupError ? error.message : "Something went wrong." })
    } finally {
      setBusy(false)
    }
  }

  const exportFile = () =>
    run(async () => {
      const backup = await exportBackup()
      downloadBackup(backup)
      return `Backup saved: ${backup.tables.games.length} games, ${backup.tables.reviews.length} reviews.`
    })

  const restoreFile = (file: File) =>
    run(async () => {
      const backup = parseBackup(await file.text(), db.verno)
      const sure = window.confirm(
        `Replace everything in this browser with the backup from ${new Date(backup.exportedAt).toLocaleString()}? ` +
          "Your current data here will be deleted.",
      )
      if (!sure) return "Restore cancelled."
      const restored = await restoreBackup(backup)
      return `Restored ${restored.games} games, ${restored.puzzles} puzzles and ${restored.reviews} reviews.`
    })

  const deleteAll = () =>
    run(async () => {
      if (!window.confirm("Delete all games, analysis, puzzles and practice history from this browser? This can't be undone."))
        return "Nothing was deleted."
      await deleteAllData()
      return "All data in this browser was deleted."
    })

  return (
    // A flat sheet on the paper. The irreversible delete sits below a hairline,
    // apart from the backup actions, so it's never one slip away from Export.
    <div className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
        {counts
          ? `This browser holds ${counts.accounts} ${counts.accounts === 1 ? "account" : "accounts"}, ${counts.games} games, ${counts.puzzles} puzzles and ${counts.reviews} practice reviews.`
          : "Counting…"}{" "}
        Nothing is stored anywhere else, so export a backup before clearing site data or switching devices.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void exportFile()} disabled={busy}>
          <Download aria-hidden /> Export backup
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
          <Upload aria-hidden /> Restore from backup
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
        <Button variant="destructive" onClick={() => void deleteAll()} disabled={busy}>
          <Trash2 aria-hidden /> Delete all data
        </Button>
        <p className="text-xs text-muted-foreground">Removes everything from this browser. It can&apos;t be undone.</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) void restoreFile(file)
          }}
        />
      </div>
      {status && (
        <p role="status" className={`text-sm ${status.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {status.text}
        </p>
      )}
    </div>
  )
}
