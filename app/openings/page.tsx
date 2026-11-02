import type { Metadata } from "next"

import { OpeningTrainer } from "@/components/openings/OpeningTrainer"

export const metadata: Metadata = { title: "Openings" }

export default function OpeningsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <OpeningTrainer />
    </div>
  )
}
