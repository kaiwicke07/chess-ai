import { Suspense, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { ChessKnight } from "lucide-react"

import { NavLink, PlainNavLink } from "@/components/layout/NavLink"
import { PuzzlesDueBadge } from "@/components/layout/PuzzlesDueBadge"
import { SoundToggle } from "@/components/layout/SoundToggle"
import { StreakBadge } from "@/components/layout/StreakBadge"
import { site } from "@/lib/site"

type LinkComponent = ComponentType<{ href: string; children: ReactNode }>

/** The three section links, drawn with either link component. */
function MainLinks({ Link: Item }: { Link: LinkComponent }) {
  return (
    <>
      <Item href="/puzzles">
        Puzzles
        {/* Client component: reads the schedule from IndexedDB */}
        <PuzzlesDueBadge />
      </Item>
      <Item href="/openings">Openings</Item>
      <Item href="/progress">Progress</Item>
    </>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`${site.name} home`}
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChessKnight className="size-4.5" aria-hidden />
          </span>
          {/* On phones the knight alone leaves room for the three links */}
          <span className="hidden text-[1.05rem] tracking-tight sm:inline">{site.name}</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-2">
          <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
            {/* The active highlight needs the path (request-time data), so it streams in */}
            <Suspense fallback={<MainLinks Link={PlainNavLink} />}>
              <MainLinks Link={NavLink} />
            </Suspense>
          </nav>
          {/* Client components: the streak reads IndexedDB, the toggle localStorage */}
          <StreakBadge />
          <SoundToggle />
        </div>
      </div>
    </header>
  )
}
