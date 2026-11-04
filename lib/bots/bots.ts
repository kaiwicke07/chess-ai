import type { UciInfo } from "@/lib/engine/uci"

/**
 * How a bot chooses its moves. Stockfish's own strength limit (UCI_Elo)
 * bottoms out at 1320, and its Skill Level makes odd, inhuman errors, so the
 * weaker bots use a sampler instead: they see Stockfish's top few moves at a
 * shallow depth and pick among them, with worse moves less likely, plus an
 * occasional move from anywhere on the board. That reads like a human who
 * mostly plays sensible moves and sometimes simply misses something.
 */
export type BotStyle =
  | {
      kind: "sampled"
      /** Search depth for the candidate moves */
      depth: number
      /** How many of Stockfish's top moves are candidates */
      candidates: number
      /**
       * Centipawns of loss at which a candidate becomes e (≈2.7) times less
       * likely than the best move. Higher plays looser.
       */
      temperature: number
      /** Chance of a move picked from all legal moves, ignoring the engine */
      randomChance: number
    }
  | { kind: "elo"; elo: number; movetimeMs: number }

export interface Bot {
  id: string
  name: string
  /** Approximate playing strength, shown on the card */
  rating: number
  blurb: string
  /** Hue of the avatar, as an OKLCH angle */
  hue: number
  style: BotStyle
}

/**
 * The lineup, weakest first. Ratings are approximate: the sampled bots are
 * tuned by feel, and Stockfish calibrates UCI_Elo for a minute per game.
 */
export const BOTS: Bot[] = [
  {
    id: "pip",
    name: "Pip",
    rating: 400,
    blurb: "Just learned how the pieces move. Leaves things hanging.",
    hue: 140,
    style: { kind: "sampled", depth: 4, candidates: 10, temperature: 260, randomChance: 0.2 },
  },
  {
    id: "rosa",
    name: "Rosa",
    rating: 800,
    blurb: "Knows the basics. Will take a free piece, and give one back.",
    hue: 80,
    style: { kind: "sampled", depth: 6, candidates: 8, temperature: 150, randomChance: 0.08 },
  },
  {
    id: "theo",
    name: "Theo",
    rating: 1200,
    blurb: "A solid club beginner. Spots simple tactics, misses deeper ones.",
    hue: 30,
    style: { kind: "sampled", depth: 8, candidates: 6, temperature: 70, randomChance: 0.025 },
  },
  {
    id: "mira",
    name: "Mira",
    rating: 1600,
    blurb: "Plays sound openings and punishes loose pieces.",
    hue: 250,
    style: { kind: "elo", elo: 1600, movetimeMs: 400 },
  },
  {
    id: "viktor",
    name: "Viktor",
    rating: 2000,
    blurb: "Strong and patient. Mistakes are rare and get punished.",
    hue: 300,
    style: { kind: "elo", elo: 2000, movetimeMs: 600 },
  },
  {
    id: "ada",
    name: "Ada",
    rating: 2400,
    blurb: "Master strength. Good luck.",
    hue: 0,
    style: { kind: "elo", elo: 2400, movetimeMs: 900 },
  },
]

export const DEFAULT_BOT = "theo"

/** A score from the side to move as one comparable number: mates beat any material. */
export function scoreValue(score: UciInfo["score"]): number {
  if (score.type === "cp") return score.value
  // Sooner mates are better for the winner, later ones less bad for the loser
  return score.value > 0 ? 100_000 - score.value * 100 : -100_000 - score.value * 100
}

/**
 * The sampled bots' choice. `lines` are Stockfish's top moves (any order),
 * `legal` every legal move in UCI, `random` a source of numbers in [0, 1).
 * Returns null only when there's no legal move.
 */
export function pickSampledMove(
  lines: Pick<UciInfo, "score" | "pv">[],
  legal: string[],
  style: Extract<BotStyle, { kind: "sampled" }>,
  random: () => number,
): string | null {
  if (!legal.length) return null
  const candidates = lines.filter((line) => line.pv[0] && legal.includes(line.pv[0]))
  if (!candidates.length || random() < style.randomChance) {
    return legal[Math.floor(random() * legal.length)]
  }

  const best = Math.max(...candidates.map((line) => scoreValue(line.score)))
  // Losses are capped so a missed mate weighs like a lost queen, not infinitely
  const weights = candidates.map((line) => Math.exp(-Math.min(best - scoreValue(line.score), 1500) / style.temperature))
  let pick = random() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < candidates.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return candidates[i].pv[0]
  }
  return candidates[0].pv[0]
}
