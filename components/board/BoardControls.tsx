import { ArrowDownUp, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Step through the game. Keyboard equivalents are handled in GameReview. */
export function BoardControls({
  ply,
  lastPly,
  onSelect,
  onFlip,
}: {
  ply: number
  lastPly: number
  onSelect: (ply: number) => void
  onFlip: () => void
}) {
  const buttons = [
    { label: "First move (↑)", icon: ChevronFirst, target: 0, disabled: ply === 0 },
    { label: "Previous move (←)", icon: ChevronLeft, target: ply - 1, disabled: ply === 0 },
    { label: "Next move (→)", icon: ChevronRight, target: ply + 1, disabled: ply === lastPly },
    { label: "Last move (↓)", icon: ChevronLast, target: lastPly, disabled: ply === lastPly },
  ]

  return (
    <div className="flex items-center gap-1">
      {buttons.map(({ label, icon: Icon, target, disabled }) => (
        <Button
          key={label}
          variant="outline"
          size="icon-lg"
          className="flex-1"
          onClick={() => onSelect(target)}
          disabled={disabled}
          aria-label={label}
          title={label}
        >
          <Icon />
        </Button>
      ))}
      <Button variant="ghost" size="icon-lg" onClick={onFlip} aria-label="Flip board (F)" title="Flip board (F)">
        <ArrowDownUp />
      </Button>
    </div>
  )
}
