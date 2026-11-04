import type { Metadata } from "next"

import { BotArena } from "@/components/bots/BotArena"

export const metadata: Metadata = {
  title: "Play a bot",
  description: "Play bots from about 400 to 2400, with a coach that stops your mistakes and explains them.",
}

export default function PlayPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <BotArena />
    </div>
  )
}
