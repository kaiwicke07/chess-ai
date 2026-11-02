import type { Metadata } from "next"

import { DataPanel } from "@/components/settings/DataPanel"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "About" }

const STEPS = [
  ["Import", "Your games come straight from the Lichess and Chess.com public APIs, fetched by your browser."],
  ["Analyze", "Stockfish runs in your browser as WebAssembly and evaluates every position at depth 14."],
  ["Judge", "Moves are flagged as inaccuracies, mistakes or blunders with Lichess's own rules, ported and tested against Lichess's results."],
  ["Explain", "Explanations are templates filled with what Stockfish's lines actually show when replayed. No language model is involved."],
  ["Practice", "Your mistakes become puzzles and opening drills, scheduled with FSRS spaced repetition so misses come back sooner."],
  ["Replay", "From any game review, replay a lost game from its turning point against Stockfish at a strength you choose."],
  ["Track", "The Progress page shows accuracy, blunder rate and puzzle results week by week, and where your errors cluster."],
] as const

const CREDITS: { name: string; href: string; license: string; note: string }[] = [
  { name: "Stockfish", href: site.stockfishSource, license: "GPL-3.0", note: "The chess engine." },
  {
    name: "stockfish.js",
    href: "https://github.com/nmrugg/stockfish.js",
    license: "GPL-3.0",
    note: "Stockfish compiled to WebAssembly; the exact files served here, with their license.",
  },
  {
    name: "Lichess",
    href: "https://github.com/lichess-org/lila",
    license: "AGPL-3.0",
    note: "The win-chance, accuracy and move-judgement formulas follow Lichess's published methods.",
  },
  { name: "chess.js", href: "https://github.com/jhlywa/chess.js", license: "BSD-2-Clause", note: "Move rules and PGN." },
  { name: "react-chessboard", href: "https://github.com/Clariity/react-chessboard", license: "MIT", note: "The board." },
  { name: "ts-fsrs", href: "https://github.com/open-spaced-repetition/ts-fsrs", license: "MIT", note: "Spaced-repetition scheduling." },
  { name: "Dexie", href: "https://github.com/dexie/Dexie.js", license: "Apache-2.0", note: "IndexedDB storage." },
  { name: "Recharts", href: "https://github.com/recharts/recharts", license: "MIT", note: "Progress charts." },
  { name: "Lucide", href: "https://github.com/lucide-icons/lucide", license: "ISC", note: "Icons, including the knight logo." },
]

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">About {site.name}</h1>
        <p className="text-pretty text-muted-foreground">
          A free chess trainer built from your own games. It runs entirely in your browser: no account, no server
          storing your data, and nothing that costs money to run.
        </p>
      </header>

      <section aria-labelledby="how" className="flex flex-col gap-4">
        <h2 id="how" className="text-xl font-semibold">
          How it works
        </h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <p className="text-sm">
                <span className="font-medium">{title}.</span> <span className="text-muted-foreground">{body}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="data" className="flex flex-col gap-4">
        <h2 id="data" className="text-xl font-semibold">
          Your data
        </h2>
        <DataPanel />
      </section>

      <section aria-labelledby="credits" className="flex flex-col gap-4">
        <h2 id="credits" className="text-xl font-semibold">
          Credits and licenses
        </h2>
        <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {CREDITS.map((credit) => (
            <li key={credit.name} className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                {credit.name}
              </a>
              <span className="font-mono text-xs text-muted-foreground">{credit.license}</span>
              <span className="text-muted-foreground sm:ml-auto sm:text-right">{credit.note}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          The Stockfish engine files served by this site are unmodified and come with their{" "}
          <a href="/stockfish/COPYING.txt" className="underline underline-offset-4 hover:text-foreground">
            GPLv3 license
          </a>
          ; their source is linked above.
        </p>
      </section>
    </div>
  )
}
