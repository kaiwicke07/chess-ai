"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const weekLabel = (week: number) => new Date(week).toLocaleDateString(undefined, { month: "short", day: "numeric" })

// Axis figures are data, so they're set in the mono face like every other number.
// The variable comes from next/font in the layout; JS can't use Tailwind's font-mono.
const tick = { fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono-face), monospace" }

/**
 * One weekly measure as a single-series area chart: a 2px line over a faint
 * wash, gaps where a week has no data, a hairline grid, and a crosshair
 * tooltip. Measures with different scales get separate charts (small
 * multiples), never a second axis. The latest value is labeled in the title
 * row, so the tooltip is never the only way to read it.
 */
export function TrendChart({
  title,
  data,
  format,
  domain,
  empty = "No data in this period",
}: {
  title: string
  data: { week: number; value: number | null }[]
  format: (value: number) => string
  domain?: [number, number]
  /** Shown instead of an empty frame when no week has a value */
  empty?: string
}) {
  const latest = [...data].reverse().find((d) => d.value !== null)

  return (
    // Printed straight on the paper under a single ink rule, like a chart in a
    // magazine column; the section heading above carries the heavy rule
    <figure className="flex min-w-0 flex-col gap-2 border-t border-border pt-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        {latest && (
          <span className="text-xs text-muted-foreground">
            <span className="font-mono text-sm font-semibold text-foreground">{format(latest.value!)}</span> week of{" "}
            {weekLabel(latest.week)}
          </span>
        )}
      </figcaption>
      {!latest && (
        <p className="flex h-44 items-center justify-center text-sm text-muted-foreground">{empty}</p>
      )}
      {/* Height includes the x-axis band, so labels never get clipped */}
      <div className={latest ? "h-44" : "hidden"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="week"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={weekLabel}
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: "var(--ink)" }}
              minTickGap={24}
            />
            <YAxis
              domain={domain ?? [0, "auto"]}
              tickFormatter={(v: number) => format(v)}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={40}
              tickCount={4}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as { week: number; value: number | null } | undefined
                if (!active || !point) return null
                return (
                  <div className="bg-ink px-2.5 py-1.5 text-xs text-ink-foreground">
                    <p className="font-mono font-semibold">{point.value === null ? "No data" : format(point.value)}</p>
                    <p className="opacity-80">Week of {weekLabel(point.week)}</p>
                  </div>
                )
              }}
            />
            <Area
              dataKey="value"
              // Straight segments: weekly values are separate measurements, and a
              // smoothed curve would overshoot between them
              type="linear"
              stroke="var(--chart-series)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="var(--chart-series)"
              fillOpacity={0.1}
              connectNulls={false}
              isAnimationActive={false}
              // A week with no data on either side has no line to sit on, so it
              // gets a dot; so does the latest week, the one the title labels
              dot={(props: { index: number; cx?: number; cy?: number }) => {
                const { index, cx, cy } = props
                const isolated = data[index - 1]?.value == null && data[index + 1]?.value == null
                const isLatest = latest !== undefined && data[index]?.week === latest.week
                if (cx === undefined || cy === undefined || data[index]?.value == null || (!isolated && !isLatest)) {
                  return <g key={index} />
                }
                return (
                  <circle key={index} cx={cx} cy={cy} r={4} fill="var(--chart-series)" stroke="var(--background)" strokeWidth={2} />
                )
              }}
              activeDot={{ r: 4, fill: "var(--chart-series)", stroke: "var(--background)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
