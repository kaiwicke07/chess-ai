import { Rating } from "ts-fsrs"
import { describe, expect, it } from "vitest"

import { BACKUP_FORMAT, BackupError, parseBackup, reviveCards } from "@/lib/db/backup"
import { scheduleNext } from "@/lib/srs/scheduler"

describe("parseBackup", () => {
  const valid = { format: BACKUP_FORMAT, version: 4, exportedAt: "2026-11-02T12:00:00.000Z", tables: { games: [{ id: "g" }] } }

  it("accepts a backup and fills in missing tables", () => {
    const backup = parseBackup(JSON.stringify(valid), 4)
    expect(backup.tables.games).toEqual([{ id: "g" }])
    expect(backup.tables.reviews).toEqual([])
  })

  it("accepts a backup from an older schema version", () => {
    expect(parseBackup(JSON.stringify({ ...valid, version: 2 }), 4).version).toBe(2)
  })

  it("rejects other files and newer versions, with a readable reason", () => {
    expect(() => parseBackup("not json", 4)).toThrow(new BackupError("That file isn't valid JSON."))
    expect(() => parseBackup(JSON.stringify({ hello: "world" }), 4)).toThrow("isn't a chess.ai backup")
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 9 }), 4)).toThrow("newer version")
  })
})

describe("reviveCards", () => {
  it("restores FSRS dates after a JSON round trip, so scheduling still works", () => {
    const now = new Date("2026-11-02T12:00:00Z")
    const fsrs = scheduleNext(undefined, Rating.Good, now)
    const card = { id: "puzzle:x", kind: "puzzle", refId: "x", account: "a", fsrs, due: fsrs.due.getTime(), createdAt: 0 }

    const [revived] = reviveCards(JSON.parse(JSON.stringify([card])))
    expect(revived.fsrs.due).toBeInstanceOf(Date)
    expect(revived.fsrs.due.getTime()).toBe(fsrs.due.getTime())
    expect(revived.fsrs.last_review).toBeInstanceOf(Date)
    // A revived card schedules exactly like the original
    const later = new Date(fsrs.due.getTime() + 1000)
    expect(scheduleNext(revived.fsrs, Rating.Good, later).due.getTime()).toBeGreaterThan(later.getTime())
  })
})
