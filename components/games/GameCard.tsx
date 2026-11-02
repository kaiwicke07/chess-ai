import { ExternalLink } from "lucide-react"

import { formatRelative, formatTimeControl, moveCount } from "@/lib/format"
import { PLATFORM_LABELS } from "@/lib/sources/normalize"
import type { Game, Result } from "@/lib/types"

const RESULT_STYLES: Record<Result, { label: string; className: string }> = {
  win: { label: "W", className: "bg-best/15 text-best" },
  loss: { label: "L", className: "bg-blunder/15 text-blunder" },
  draw: { label: "D", className: "bg-muted text-muted-foreground" },
}

const SPEED_LABELS: Record<Game["speed"], string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
}

/** One row of the game list. */
export function GameCard({ game }: { game: Game }) {
  const opponent = game.userColor === "white" ? game.black : game.white
  const result = RESULT_STYLES[game.result]

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <span
        className={`flex size-7 items-center justify-center rounded-md text-xs font-semibold ${result.className}`}
        aria-label={game.result}
      >
        {result.label}
      </span>

      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 truncate font-medium">
          <span
            className={`size-2.5 shrink-0 rounded-full ${game.userColor === "white" ? "bg-white" : "bg-neutral-950 ring-1 ring-neutral-300"}`}
            title={`You played ${game.userColor}`}
          />
          <span className="truncate">
            vs {opponent.name}
            {opponent.rating !== null && (
              <span className="font-normal text-muted-foreground"> ({opponent.rating})</span>
            )}
          </span>
        </span>
        <span className="truncate text-xs text-muted-foreground sm:hidden">
          {game.opening.name ?? "Unknown opening"}
        </span>
      </div>

      <span className="hidden truncate text-sm text-muted-foreground sm:block">
        {game.opening.eco && <span className="mr-2 font-mono text-xs">{game.opening.eco}</span>}
        {game.opening.name ?? "Unknown opening"}
      </span>

      <div className="flex items-center gap-3 text-right text-xs text-muted-foreground">
        <span className="flex flex-col">
          <span>
            {SPEED_LABELS[game.speed]} {formatTimeControl(game.timeControl)} · {moveCount(game)} moves
          </span>
          <span>{formatRelative(game.playedAt)}</span>
        </span>
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1 hover:bg-muted hover:text-foreground"
          aria-label={`Open game vs ${opponent.name} on ${PLATFORM_LABELS[game.platform]}`}
        >
          <ExternalLink className="size-4" />
        </a>
      </div>
    </li>
  )
}
