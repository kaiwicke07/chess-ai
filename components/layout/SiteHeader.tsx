import Link from "next/link"
import { ChessKnight } from "lucide-react"

import { PuzzlesDueBadge } from "@/components/layout/PuzzlesDueBadge"
import { site } from "@/lib/site"

const LINK = "flex items-center rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground sm:px-3"

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" aria-label={`${site.name} home`}>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChessKnight className="size-4" aria-hidden />
          </span>
          {/* On phones the knight alone leaves room for the three links */}
          <span className="hidden sm:inline">{site.name}</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/puzzles" className={LINK}>
            Puzzles
            {/* Client component: reads the schedule from IndexedDB */}
            <PuzzlesDueBadge />
          </Link>
          <Link href="/openings" className={LINK}>
            Openings
          </Link>
          <Link href="/progress" className={LINK}>
            Progress
          </Link>
        </nav>
      </div>
    </header>
  )
}
