export interface BreakdownRow {
  key: string
  label: React.ReactNode
  /** Games or moves behind the row, shown so small samples are visible */
  count: number
  countLabel: string
  /** Mistakes and blunders per 100 moves */
  errorRate: number
  accuracy: number
  extra?: React.ReactNode
}

/**
 * A table where the error-rate column carries an inline bar, so the numbers
 * and the comparison are one thing: the table is its own accessible view.
 * Bars share one hue (they're one measure) and one scale, set by the worst row.
 */
export function BreakdownTable({
  rows,
  head,
  extraHead,
}: {
  rows: BreakdownRow[]
  head: string
  extraHead?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.errorRate))
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-normal">{head}</th>
            <th className="px-2 py-2 text-right font-normal">{rows[0]?.countLabel ?? ""}</th>
            {extraHead && <th className="px-2 py-2 text-right font-normal">{extraHead}</th>}
            <th className="px-2 py-2 text-right font-normal">Accuracy</th>
            <th className="w-2/5 px-4 py-2 text-left font-normal">Mistakes + blunders per 100 moves</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="px-4 py-2">{row.label}</td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.count}</td>
              {extraHead && <td className="px-2 py-2 text-right tabular-nums">{row.extra}</td>}
              <td className="px-2 py-2 text-right tabular-nums">{Math.round(row.accuracy)}%</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1">
                    <div
                      className="h-full rounded-r-[4px] bg-chart-series"
                      style={{ width: `${(row.errorRate / max) * 100}%`, minWidth: row.errorRate > 0 ? 2 : 0 }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">{row.errorRate.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
