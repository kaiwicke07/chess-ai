"use client"

import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"

import { db } from "@/lib/db/schema"

/**
 * Everything depends on IndexedDB. Some private browsing modes and strict
 * privacy settings block it, which would otherwise look like pages that never
 * load. Opening the database up front turns that into a clear message.
 */
export function StorageWarning() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    db.open().catch(() => setBlocked(true))
  }, [])

  if (!blocked) return null
  return (
    // A flat tinted field across the page, closed by an ink rule like a printed notice band
    <div role="alert" className="border-b border-border bg-blunder/10">
      <p className="mx-auto flex w-full max-w-6xl items-start gap-2 px-4 py-3 text-sm font-medium sm:px-6">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-blunder" aria-hidden />
        This browser is blocking local storage, which this app needs to keep your games and progress. Private browsing
        or strict privacy settings usually cause this; try a normal window.
      </p>
    </div>
  )
}
