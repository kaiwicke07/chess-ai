import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"

/**
 * One entry in the headline results row: a small-caps label, the figure, and
 * its change against the previous period. It renders as a `dt`/`dd` group,
 * so the row is a description list, set like a printed results table rather
 * than a stack of cards. The change is colored by whether it's an
 * improvement, which depends on the measure (accuracy up is good, blunders up
 * is bad), and also carries an arrow, so it never relies on color alone.
 */
export function StatTile({
  label,
  value,
  detail,
  change,
}: {
  label: string
  value: string
  detail?: string
  change?: { text: string; direction: "up" | "down" | "flat"; good: boolean | null } | null
}) {
  const tone = !change || change.good === null ? "text-muted-foreground" : change.good ? "text-best" : "text-blunder"
  const Arrow = change?.direction === "up" ? ArrowUp : change?.direction === "down" ? ArrowDown : ArrowRight
  return (
    // Narrow screens: one ruled line per measure, label left and figure right.
    // Wide screens: four columns divided by hairlines, read across like a table.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0 lg:flex lg:flex-col lg:items-start lg:gap-2 lg:border-b-0 lg:border-l lg:px-5 lg:py-4 lg:first:border-l-0 lg:first:pl-0">
      <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="col-start-2 row-span-2 row-start-1 text-right font-display text-4xl tabular-nums sm:text-5xl lg:text-left">
        {value}
      </dd>
      <dd className="col-start-1 row-start-2 flex flex-col gap-0.5 font-mono text-xs text-muted-foreground">
        {change && (
          <span className={`flex items-center gap-1 ${tone}`}>
            <Arrow className="size-3.5 shrink-0" aria-hidden />
            {change.text}
          </span>
        )}
        {detail && <span>{detail}</span>}
      </dd>
    </div>
  )
}
