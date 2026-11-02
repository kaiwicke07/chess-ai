import Link from "next/link"

import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>
          Runs entirely in your browser. Analysis by{" "}
          <a
            href={site.stockfishSource}
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stockfish
          </a>{" "}
          (
          <a href="/stockfish/COPYING.txt" className="underline underline-offset-4 hover:text-foreground">
            GPLv3
          </a>
          ).
        </p>
        <Link href="/about" className="underline-offset-4 hover:text-foreground hover:underline">
          About, credits and your data
        </Link>
      </div>
    </footer>
  )
}
