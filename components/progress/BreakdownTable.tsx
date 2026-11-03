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
 * Set like a printed results table: an ink rule under the small-caps head,
 * hairlines between rows, figures in mono, flat square bars.
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[11px] font-semibold text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-2 text-left font-semibold">{head}</th>
            <th className="px-2 py-2 text-right font-semibold">{rows[0]?.countLabel ?? ""}</th>
            {extraHead && <th className="px-2 py-2 text-right font-semibold">{extraHead}</th>}
            <th className="px-2 py-2 text-right font-semibold">Accuracy</th>
            <th className="w-2/5 py-2 pl-4 text-left font-semibold">Mistakes + blunders per 100 moves</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-0">
              <td className="py-2 pr-2">{row.label}</td>
              <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">{row.count}</td>
              {extraHead && <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">{row.extra}</td>}
              <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">{Math.round(row.accuracy)}%</td>
              <td className="py-2 pl-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 flex-1">
                    <div
                      className="h-full bg-chart-series"
                      style={{ width: `${(row.errorRate / max) * 100}%`, minWidth: row.errorRate > 0 ? 2 : 0 }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs tabular-nums">{row.errorRate.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
