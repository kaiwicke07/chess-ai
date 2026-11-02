import { z } from "zod"

import type { ReviewCard } from "@/lib/types"
import { db } from "./schema"

export const BACKUP_FORMAT = "chess-trainer-backup"

/** Every table, in an order where nothing refers to a table restored later. */
export const BACKUP_TABLES = ["accounts", "games", "evals", "analyses", "puzzles", "cards", "reviews"] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]

export interface Backup {
  format: typeof BACKUP_FORMAT
  /** Database schema version the backup was made with */
  version: number
  exportedAt: string
  tables: Record<BackupTable, unknown[]>
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BackupError"
  }
}

/** Snapshot of everything in this browser's database. */
export async function exportBackup(): Promise<Backup> {
  const tables = {} as Record<BackupTable, unknown[]>
  await db.transaction("r", BACKUP_TABLES.map((name) => db.table(name)), async () => {
    for (const name of BACKUP_TABLES) tables[name] = await db.table(name).toArray()
  })
  return { format: BACKUP_FORMAT, version: db.verno, exportedAt: new Date().toISOString(), tables }
}

/** Saves a backup as a JSON file through the browser's download. */
export function downloadBackup(backup: Backup) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `chess-trainer-backup-${backup.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const backupShape = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  // Missing tables (from an older version) restore as empty
  tables: z.object(Object.fromEntries(BACKUP_TABLES.map((name) => [name, z.array(z.unknown()).default([])]))),
})

/**
 * Reads a backup file's text. Rejects anything that isn't one of our backups,
 * or that was made by a newer version of the app than this one, whose data
 * this version might not understand.
 */
export function parseBackup(text: string, currentVersion: number): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError("That file isn't valid JSON.")
  }
  const parsed = backupShape.safeParse(json)
  if (!parsed.success) throw new BackupError("That file isn't a chess.ai backup.")
  if (parsed.data.version > currentVersion) {
    throw new BackupError("That backup is from a newer version of the app. Update this page and try again.")
  }
  return parsed.data as Backup
}

/**
 * JSON turns Dates into strings; FSRS needs them back as Dates. Only card
 * schedules hold Dates (`due` and `last_review` inside `fsrs`).
 */
export function reviveCards(cards: unknown[]): ReviewCard[] {
  return (cards as ReviewCard[]).map((card) => ({
    ...card,
    fsrs: {
      ...card.fsrs,
      due: new Date(card.fsrs.due),
      ...(card.fsrs.last_review ? { last_review: new Date(card.fsrs.last_review) } : {}),
    },
  }))
}

/**
 * Replaces everything in this browser with the backup, in one transaction:
 * either the whole restore lands or nothing changes. Replacing rather than
 * merging keeps review log ids consistent (they're auto-numbered).
 */
export async function restoreBackup(backup: Backup): Promise<Record<BackupTable, number>> {
  const counts = {} as Record<BackupTable, number>
  await db.transaction("rw", BACKUP_TABLES.map((name) => db.table(name)), async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table(name)
      await table.clear()
      const rows = name === "cards" ? reviveCards(backup.tables.cards) : backup.tables[name]
      await table.bulkPut(rows)
      counts[name] = rows.length
    }
  })
  return counts
}

/** Permanently removes every game, analysis, puzzle and review from this browser. */
export async function deleteAllData() {
  await db.transaction("rw", BACKUP_TABLES.map((name) => db.table(name)), async () => {
    for (const name of BACKUP_TABLES) await db.table(name).clear()
  })
}
