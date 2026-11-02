import type { Judgement } from "@/lib/analysis/classify"

/** Tailwind text classes per judgement, from the theme tokens in globals.css */
export const JUDGEMENT_TEXT: Record<Judgement, string> = {
  inaccuracy: "text-inaccuracy",
  mistake: "text-mistake",
  blunder: "text-blunder",
}

/** Raw colors for SVG (board arrows, graph dots), which can't use Tailwind classes */
export const JUDGEMENT_COLORS: Record<Judgement, string> = {
  inaccuracy: "var(--inaccuracy)",
  mistake: "var(--mistake)",
  blunder: "var(--blunder)",
}

export const BEST_COLOR = "var(--best)"
