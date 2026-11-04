"use client"

import { useEffect, useRef } from "react"

/**
 * Single-key shortcuts for a page, e.g. `{ h: hint, s: showSolution }`.
 * Keys are matched on `event.key`, lowercased. Ignored while typing in a form
 * field or with a modifier held, so browser shortcuts keep working. A handler
 * can be null to disable its key for now.
 */
export function useHotkeys(bindings: Record<string, (() => void) | null>) {
  // The latest bindings are read at keypress time, so the listener is attached once
  const current = useRef(bindings)
  useEffect(() => {
    current.current = bindings
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      const target = event.target
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]")) return
      const handler = current.current[event.key.toLowerCase()]
      if (!handler) return
      event.preventDefault()
      handler()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
