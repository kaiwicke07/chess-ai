/**
 * A headline number with an optional change against the previous period.
 * The change is colored by whether it's an improvement, which depends on
 * the measure (accuracy up is good, blunders up is bad), and also carries an
 * arrow, so it never relies on color alone.
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
  const arrow = change?.direction === "up" ? "↑" : change?.direction === "down" ? "↓" : "→"
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground">
        {change && (
          <span className={tone}>
            {arrow} {change.text}
          </span>
        )}
        {change && detail && " · "}
        {detail}
      </span>
    </div>
  )
}
