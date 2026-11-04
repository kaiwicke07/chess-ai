"use client"

import { useState } from "react"
import { GraduationCap, Play } from "lucide-react"

import { BotAvatar } from "@/components/bots/BotAvatar"
import { BotGame } from "@/components/bots/BotGame"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BOTS, DEFAULT_BOT } from "@/lib/bots/bots"
import { COACH_LEVELS, type CoachLevel } from "@/lib/bots/coach"
import type { Color } from "@/lib/types"

type Side = Color | "random"
type Match = { botId: string; color: Color; coach: CoachLevel; round: number }

// Same rounded chips as the puzzle and opening filters
const SEGMENT =
  "h-9 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:border-primary/50 aria-pressed:bg-primary/15 aria-pressed:text-foreground"

const SIDES: { id: Side; label: string }[] = [
  { id: "white", label: "White" },
  { id: "random", label: "Random" },
  { id: "black", label: "Black" },
]

/** Pick a bot, a side and how closely the coach watches, then play. */
export function BotArena() {
  const [botId, setBotId] = useState(DEFAULT_BOT)
  const [side, setSide] = useState<Side>("white")
  const [coach, setCoach] = useState<CoachLevel>("mistakes")
  const [match, setMatch] = useState<Match | null>(null)

  const start = (round = 0) =>
    setMatch({
      botId,
      color: side === "random" ? (Math.random() < 0.5 ? "white" : "black") : side,
      coach,
      round,
    })

  if (match) {
    const bot = BOTS.find((b) => b.id === match.botId)!
    return (
      <BotGame
        // A rematch remounts the game: fresh board, fresh engine
        key={`${match.botId}:${match.round}`}
        bot={bot}
        userColor={match.color}
        coach={match.coach}
        // Rematches swap colors, as over the board
        onRematch={() => setMatch({ ...match, color: match.color === "white" ? "black" : "white", round: match.round + 1 })}
        onExit={() => setMatch(null)}
      />
    )
  }

  const selected = BOTS.find((b) => b.id === botId)!

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="page-title">Play a bot</h1>
        <p className="max-w-prose text-muted-foreground">
          Pick an opponent around your level. With the coach on, a bad move pauses the game: you see why it fails and
          get to try again.
        </p>
      </header>

      <section aria-labelledby="opponents" className="flex flex-col gap-3">
        <h2 id="opponents" className="section-title">
          Opponent
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOTS.map((bot) => {
            const active = bot.id === botId
            return (
              <li key={bot.id}>
                <button
                  type="button"
                  onClick={() => setBotId(bot.id)}
                  aria-pressed={active}
                  className={`flex h-full w-full items-start gap-3 rounded-xl bg-card p-4 text-left ring-1 transition-[box-shadow,background-color] outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring ${active ? "ring-2 ring-primary" : "ring-foreground/10"}`}
                >
                  <BotAvatar bot={bot} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold">{bot.name}</span>
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">~{bot.rating}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">{bot.blurb}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Ratings are approximate. The three strongest use Stockfish&apos;s own rating limit; the others pick among its
          top moves and sometimes miss things, like people do.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="side" className="flex flex-col gap-3">
          <h2 id="side" className="section-title">
            Play as
          </h2>
          <ToggleGroup value={[side]} onValueChange={(v) => v[0] && setSide(v[0] as Side)} spacing={1.5} className="flex-wrap gap-1.5" aria-labelledby="side">
            {SIDES.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className={SEGMENT}>
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section aria-labelledby="coach" className="flex flex-col gap-3">
          <h2 id="coach" className="section-title flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" aria-hidden /> Coach
          </h2>
          <ToggleGroup value={[coach]} onValueChange={(v) => v[0] && setCoach(v[0] as CoachLevel)} spacing={1.5} className="flex-wrap gap-1.5" aria-labelledby="coach">
            {COACH_LEVELS.map((level) => (
              <ToggleGroupItem key={level.id} value={level.id} className={SEGMENT}>
                {level.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">{COACH_LEVELS.find((l) => l.id === coach)!.hint}.</p>
        </section>
      </div>

      <div className="flex items-center gap-4 border-t border-border pt-6">
        <Button size="lg" className="h-11 rounded-lg px-5 text-[0.95rem] font-semibold" onClick={() => start()}>
          <Play aria-hidden /> Play {selected.name}
        </Button>
      </div>
    </div>
  )
}
