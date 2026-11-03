import {
  ArrowRight,
  CalendarSync,
  GitBranch,
  Puzzle,
  Swords,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import Link from "next/link"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { UsernameForm } from "@/components/games/UsernameForm"
import { CoverBoard } from "@/components/landing/CoverBoard"
import { site } from "@/lib/site"

const FEATURES: { icon: LucideIcon; title: string; body: string; href: string }[] = [
  {
    icon: Puzzle,
    title: "Puzzles from your blunders",
    body: "Positions where you went wrong, kept only when Stockfish finds one clearly best move.",
    href: "/puzzles",
  },
  {
    icon: CalendarSync,
    title: "Spaced repetition",
    body: "Missed puzzles come back sooner; the ones you know get spaced out.",
    href: "/puzzles",
  },
  {
    icon: GitBranch,
    title: "Opening trainer",
    body: "See where you leave the good moves in your own openings, then drill the fix.",
    href: "/openings",
  },
  {
    icon: Swords,
    title: "Replay the turning point",
    body: "Restart a lost game from the move where it turned and play it out against Stockfish.",
    href: "/about#how",
  },
  {
    icon: TrendingUp,
    title: "Progress over weeks",
    body: "Blunder rate, accuracy and puzzle results, and where your errors cluster.",
    href: "/progress",
  },
]

/** A public account to try the app with, for visitors without their own */
const DEMO = { platform: "lichess", username: "penguingim1", label: "a grandmaster's public Lichess games (penguingim1)" }

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-12 sm:px-6 sm:pt-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-display text-[clamp(2.5rem,6vw,3.75rem)] text-balance">{site.tagline}</h1>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">{site.description}</p>
          <UsernameForm />
          <p className="-mt-3 text-sm text-muted-foreground">
            No account handy?{" "}
            <Link href={`/u/${DEMO.platform}/${DEMO.username}`} className="font-medium text-primary underline-offset-4 hover:underline">
              Try it with {DEMO.label}
            </Link>
          </p>
          <RecentAccounts />
        </div>

        <ExampleReview />
      </section>

      <section aria-labelledby="features-heading" className="flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight">
            Practice what you actually get wrong
          </h2>
          <p className="text-lg text-muted-foreground">
            Every game you import is analyzed move by move. Your mistakes become the training material.
          </p>
        </div>
        <ul className="grid gap-x-10 gap-y-2 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="group -mx-3 flex gap-4 rounded-xl p-3 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{title}</span>
                  <span className="text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-5 rounded-2xl bg-card p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Free, private, and it runs in your browser.</h2>
          <p className="text-muted-foreground">No account to make. Your games and progress stay on this device.</p>
        </div>
        <Link
          href={`/u/${DEMO.platform}/${DEMO.username}`}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Try the demo
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  )
}

/** The example board with the kind of feedback the review shows. Illustrative, not a loaded game. */
function ExampleReview() {
  return (
    <figure aria-label="Example analysis" className="flex flex-col gap-3 rounded-2xl bg-card p-3 sm:p-4">
      <CoverBoard />
      <figcaption className="flex flex-col gap-1.5 rounded-xl bg-blunder/10 p-4">
        <span className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-blunder">Blunder · 14. Qd2??</span>
          <span className="font-mono text-muted-foreground">+0.4 → −2.6</span>
        </span>
        <span className="text-[0.95rem]">
          The queen leaves the e5 knight undefended, so …Bxe5 wins it. Best was{" "}
          <span className="font-mono font-semibold text-best">14. f4</span>.
        </span>
      </figcaption>
    </figure>
  )
}
