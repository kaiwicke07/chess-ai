import type { Metadata } from "next"

import { PuzzleTrainer } from "@/components/puzzles/PuzzleTrainer"

export const metadata: Metadata = { title: "Puzzles" }

export default function PuzzlesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PuzzleTrainer />
    </div>
  )
}
