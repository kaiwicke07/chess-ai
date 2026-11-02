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
          className={`size-3 shrink-0 rounded-sm ${color === "white" ? "bg-white" : "bg-neutral-950 ring-1 ring-neutral-300"}`}
          aria-label={color}
        />
        <span className="truncate font-medium">{player.name}</span>
        {player.rating !== null && <span className="text-sm text-muted-foreground">{player.rating}</span>}
        {isUser && <span className="text-xs text-muted-foreground">(you)</span>}
      </div>
      {clock !== null && (
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-sm tabular-nums ${toMove ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
        >
          {formatClock(clock)}
        </span>
      )}
    </div>
  )
}
