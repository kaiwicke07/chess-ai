import { formatClock } from "@/lib/format"
import type { Color, Player } from "@/lib/types"

/** Name, rating and clock shown above or below the board. */
export function PlayerBar({
  player,
  color,
  clock,
  toMove,
  isUser,
}: {
  player: Player
  color: Color
  clock: number | null
  toMove: boolean
  isUser: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`size-3 shrink-0 rounded-full ring-1 ring-foreground/30 ${color === "white" ? "bg-neutral-100" : "bg-neutral-900"}`}
          aria-label={color}
        />
        <span className="truncate font-semibold">{player.name}</span>
        {player.rating !== null && (
          <span className="font-mono text-sm text-muted-foreground tabular-nums">{player.rating}</span>
        )}
        {isUser && <span className="text-xs font-semibold text-muted-foreground">(you)</span>}
      </div>
      {clock !== null && (
        <span
          className={`px-2 py-0.5 font-mono text-sm font-semibold tabular-nums ${toMove ? "bg-ink text-ink-foreground" : "bg-muted text-foreground"}`}
        >
          {formatClock(clock)}
        </span>
      )}
    </div>
  )
}
