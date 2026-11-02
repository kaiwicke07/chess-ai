"use client"

import { useEffect, useState } from "react"

/**
 * The current time, refreshed every `intervalMs`, so time-based views (cards
 * coming due) update while the page stays open. Starts at 0 and is set right
 * after mount: reading the clock during render would differ between the
 * server and the browser, and React's purity rules forbid it.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(0)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [intervalMs])
  return now
}
