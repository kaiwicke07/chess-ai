import Link from "next/link"
import { ChessKnight } from "lucide-react"

import { PuzzlesDueBadge } from "@/components/layout/PuzzlesDueBadge"
import { site } from "@/lib/site"

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChessKnight className="size-4" aria-hidden />
          </span>
          {site.name}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link
            href="/puzzles"
            className="flex items-center rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Puzzles
            {/* Client component: reads the schedule from IndexedDB */}
            <PuzzlesDueBadge />
          </Link>
          <Link
            href="/openings"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Openings
          </Link>
        </nav>
      </div>
    </header>
  )
}
