import type { Metadata } from "next"
import Link from "next/link"

import { DataPanel } from "@/components/settings/DataPanel"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "About" }

const STEPS = [
  ["Import", "Your games come straight from the Lichess and Chess.com public APIs, fetched by your browser."],
  ["Analyze", "Stockfish runs in your browser as WebAssembly and evaluates every position at depth 14."],
  ["Judge", "Moves are flagged as inaccuracies, mistakes or blunders with Lichess's own rules, ported and tested against Lichess's results."],
  ["Explain", "Explanations are templates filled with what Stockfish's lines actually show when replayed. No language model is involved."],
  ["Practice", "Your mistakes become puzzles and opening drills, scheduled with FSRS spaced repetition so misses come back sooner."],
  ["Replay", "From any analyzed game, replay a loss from its turning point against Stockfish at a strength you choose."],
  ["Track", "The Progress page shows accuracy, blunder rate and puzzle results week by week, and where your errors cluster."],
] as const

const CREDITS: { name: string; href: string; license: string; note: string }[] = [
  { name: "Stockfish", href: site.stockfishSource, license: "GPL-3.0", note: "The chess engine." },
  {
    name: "stockfish.js 19.0.1",
    href: site.stockfishJsSource,
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

// Read mode: one column, prose held to a 65-75ch measure, each section opened
// by a heavy ink rule, links in the action color and always underlined
const SECTION = "flex flex-col gap-4 border-t border-border pt-4"
const LINK = "text-primary underline underline-offset-4 hover:decoration-2"

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <h1 className="page-title">About {site.name}</h1>
        <p className="max-w-[65ch] text-lg leading-relaxed text-pretty">
          A free chess trainer built from your own games. It runs entirely in your browser: no account, no server
          storing your data, and nothing that costs money to run.
        </p>
      </header>

      <section aria-labelledby="how" className={SECTION}>
        <h2 id="how" className="section-title">
          How it works
        </h2>
        {/* The steps run in order (an ol), set as a ruled list: the verb in a
            narrow column, its explanation beside it */}
        <ol className="flex flex-col">
          {STEPS.map(([title, body]) => (
            <li key={title} className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <span className="font-semibold">{title}</span>
              <p className="max-w-[65ch] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="data" className={SECTION}>
        <h2 id="data" className="section-title">
          Your data
        </h2>
        <DataPanel />
      </section>

      <section aria-labelledby="credits" className={SECTION}>
        <h2 id="credits" className="section-title">
          Credits and licenses
        </h2>
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {CREDITS.map((credit) => (
            <li key={credit.name} className="flex flex-col gap-0.5 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className={`font-semibold ${LINK}`}>
                {credit.name}
              </a>
              <span className="font-mono text-xs text-muted-foreground">{credit.license}</span>
              <span className="text-muted-foreground sm:ml-auto sm:text-right">{credit.note}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-[70ch] leading-relaxed text-muted-foreground">
          The Stockfish engine files served by this site are the unmodified stockfish.js 19.0.1 release and come with
          their{" "}
          <a href="/stockfish/COPYING.txt" className={LINK}>
            GPLv3 license
          </a>
          ; their exact source is linked above.
        </p>
      </section>

      <section aria-labelledby="license" className={SECTION}>
        <h2 id="license" className="section-title">
          License and source
        </h2>
        <p className="max-w-[70ch] leading-relaxed text-muted-foreground">
          {site.name} itself is free software under the{" "}
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" className={LINK}>
            GNU AGPL v3.0
          </a>{" "}
          or later. Its complete source code is at{" "}
          <a href={site.sourceUrl} className={LINK}>
            github.com/kaiwicke07/chess-ai
          </a>
          . It is an independent project, not affiliated with or endorsed by Lichess or Chess.com. See also the{" "}
          <Link href="/privacy" className={LINK}>
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className={LINK}>
            terms of use
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
