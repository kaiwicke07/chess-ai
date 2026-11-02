import { Rating, State } from "ts-fsrs"
import { describe, expect, it } from "vitest"

import { dailyQueue, NEW_PER_DAY, startOfDay } from "@/lib/srs/dailyQueue"
import { gradeFor } from "@/lib/srs/grading"
import { formatInterval, scheduleNext } from "@/lib/srs/scheduler"
import type { Puzzle, ReviewCard } from "@/lib/types"

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const NOW = new Date("2026-11-02T12:00:00").getTime()

describe("gradeFor", () => {
  it("maps attempts to FSRS grades", () => {
    expect(gradeFor("failed", 5_000, 1)).toBe(Rating.Again)
    expect(gradeFor("hinted", 5_000, 1)).toBe(Rating.Hard)
    expect(gradeFor("retried", 5_000, 1)).toBe(Rating.Hard)
    expect(gradeFor("clean", 25_000, 1)).toBe(Rating.Good)
  })

  it("rewards a fast clean solve, allowing more time for longer puzzles", () => {
    expect(gradeFor("clean", 9_000, 1)).toBe(Rating.Easy)
    expect(gradeFor("clean", 25_000, 3)).toBe(Rating.Easy)
    expect(gradeFor("clean", 35_000, 3)).toBe(Rating.Good)
  })
})

describe("scheduleNext", () => {
  // Fuzz shifts intervals by a few percent, so check ranges rather than exact times
  const at = new Date(NOW)
  const after = (grade: Parameters<typeof scheduleNext>[1]) => scheduleNext(undefined, grade, at).due.getTime() - NOW

  it("brings a missed puzzle back in the same session", () => {
    expect(after(Rating.Again)).toBe(10 * MINUTE)
    expect(after(Rating.Hard)).toBeLessThan(DAY)
  })

  it("sends a correct first solve straight to days", () => {
    expect(after(Rating.Good)).toBeGreaterThanOrEqual(DAY)
    expect(after(Rating.Good)).toBeLessThan(4 * DAY)
    expect(after(Rating.Easy)).toBeGreaterThan(5 * DAY)
  })

  it("grows the interval with each successful review and resets on a lapse", () => {
    const first = scheduleNext(undefined, Rating.Good, at)
    const second = scheduleNext(first, Rating.Good, first.due)
    const gap1 = first.due.getTime() - NOW
    const gap2 = second.due.getTime() - first.due.getTime()
    expect(gap2).toBeGreaterThan(2 * gap1)
    expect(second.state).toBe(State.Review)

    const lapse = scheduleNext(second, Rating.Again, second.due)
    expect(lapse.due.getTime() - second.due.getTime()).toBe(10 * MINUTE)
    expect(lapse.lapses).toBe(1)
  })

  it("formats intervals", () => {
    expect(formatInterval(NOW + 10 * MINUTE, NOW)).toBe("10 minutes")
    expect(formatInterval(NOW + 3 * 60 * MINUTE, NOW)).toBe("3 hours")
    expect(formatInterval(NOW + DAY, NOW)).toBe("1 day")
    expect(formatInterval(NOW + 21 * DAY, NOW)).toBe("3 weeks")
  })
})

describe("dailyQueue", () => {
  const puzzle = (id: string) => ({ id }) as Puzzle
  const card = (id: string, due: number, createdAt = NOW - 30 * DAY) =>
    [id, { id: `puzzle:${id}`, refId: id, due, createdAt } as ReviewCard] as const

  it("puts overdue reviews first, most overdue first, then new puzzles", () => {
    const puzzles = ["a", "b", "c", "d"].map(puzzle)
    const cards = new Map([card("a", NOW - MINUTE), card("b", NOW - DAY), card("c", NOW + DAY)])
    const queue = dailyQueue(puzzles, cards, NOW)

    expect(queue.due.map((p) => p.id)).toEqual(["b", "a"])
    expect(queue.fresh.map((p) => p.id)).toEqual(["d"])
    expect(queue.nextDue).toBe(NOW + DAY)
  })

  it(`introduces at most ${NEW_PER_DAY} new puzzles a day`, () => {
    const puzzles = Array.from({ length: 30 }, (_, i) => puzzle(`p${i}`))
    expect(dailyQueue(puzzles, new Map(), NOW).fresh).toHaveLength(NEW_PER_DAY)

    // Four started today (scheduled for later), so six new ones are left
    const today = startOfDay(NOW) + MINUTE
    const started = new Map(["p0", "p1", "p2", "p3"].map((id) => card(id, NOW + DAY, today)))
    const queue = dailyQueue(puzzles, started, NOW)
    expect(queue.fresh).toHaveLength(NEW_PER_DAY - 4)
    expect(queue.fresh[0].id).toBe("p4")
  })

  it("ignores cards whose puzzle was regenerated away", () => {
    const queue = dailyQueue([puzzle("a")], new Map([card("gone", NOW - DAY)]), NOW)
    expect(queue.due).toEqual([])
    expect(queue.fresh.map((p) => p.id)).toEqual(["a"])
  })
})
