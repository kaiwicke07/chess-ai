import Link from "next/link"

import { site } from "@/lib/site"

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Runs entirely in your browser. Analysis by{" "}
            <a href={site.stockfishSource} className="underline underline-offset-4 hover:text-foreground" target="_blank" rel="noopener noreferrer">
              Stockfish
            </a>{" "}
            (
            <a href="/stockfish/COPYING.txt" className="underline underline-offset-4 hover:text-foreground">
              GPLv3
            </a>
            ).
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
            {/* The AGPL asks that people using the site over a network be offered its source */}
            <a href={site.sourceUrl} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
              Source code
            </a>
          </nav>
        </div>
        {/* Chess.com's API terms require this statement */}
        <p className="text-xs">
          {site.name} is not affiliated with or endorsed by Lichess or Chess.com. Free and open source under AGPL-3.0.
        </p>
      </div>
    </footer>
  )
}
