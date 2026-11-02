import {
  CalendarSync,
  GitBranch,
  MessageSquareText,
  Puzzle,
  Swords,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { RecentAccounts } from "@/components/games/RecentAccounts"
import { UsernameForm } from "@/components/games/UsernameForm"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { site } from "@/lib/site"

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Puzzle,
    title: "Puzzles from your blunders",
    body: "Positions where you went wrong, kept only when Stockfish finds one clearly best move.",
  },
  {
    icon: CalendarSync,
    title: "Spaced repetition",
    body: "FSRS scheduling brings missed puzzles back sooner and spaces out the ones you know.",
  },
  {
    icon: GitBranch,
    title: "Opening trainer",
    body: "A tree of your own openings that shows where you leave the good moves, then drills the fix.",
  },
  {
    icon: Swords,
    title: "Replay critical positions",
    body: "Restart a lost game from its turning point and play it out against Stockfish.",
  },
  {
    icon: TrendingUp,
    title: "Progress over weeks",
    body: "Blunder rate, puzzle accuracy, and weak spots by opening, phase and time pressure.",
  },
  {
    icon: MessageSquareText,
    title: "Explanations from engine facts",
    body: "Short notes like “This hangs your knight to Nxe5”, built from Stockfish's lines.",
  },
]

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 py-16 sm:px-6 sm:py-24">
      <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="outline">Free · runs in your browser</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {site.tagline}
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">{site.description}</p>
          <UsernameForm />
          <RecentAccounts />
        </div>
        <ExampleReview />
      </section>

      <section aria-labelledby="features-heading" className="flex flex-col gap-6">
        <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">
          What it trains
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="mb-2 size-5 text-primary" aria-hidden />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

// Static mock of the review panel, showing the kind of output the app produces.
function ExampleReview() {
  const moves = [
    { number: 12, white: "Nf3", black: "Be7" },
    { number: 13, white: "O-O", black: "d5" },
  ]

  return (
    <Card aria-label="Example game review" className="w-full">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Example review</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="grid grid-cols-[2.5rem_5rem_5rem] gap-y-1 font-mono text-sm">
          {moves.map((move) => (
            <li key={move.number} className="contents">
              <span className="text-muted-foreground">{move.number}.</span>
              <span>{move.white}</span>
              <span>{move.black}</span>
            </li>
          ))}
          <li className="contents">
            <span className="text-muted-foreground">14.</span>
            <span className="font-semibold text-blunder">Qd2??</span>
            <span className="text-muted-foreground">…</span>
          </li>
        </ol>

        <div className="flex flex-col gap-2 rounded-lg border border-blunder/30 bg-blunder/10 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blunder">Blunder</span>
            <span className="font-mono text-muted-foreground">+0.4 → −2.6</span>
          </div>
          <p className="text-sm">
            This leaves your knight on e5 undefended: …Bxe5 wins it. Best was{" "}
            <span className="font-mono text-best">14. f4</span>.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Saved as a puzzle</span>
          <span>Next review: today</span>
        </div>
      </CardContent>
    </Card>
  )
}
