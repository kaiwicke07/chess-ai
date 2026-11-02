import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReviewSkeleton } from "@/components/board/GameReview"
import { ReplayGame } from "@/components/replay/ReplayGame"
import { isPlatform } from "@/lib/sources/normalize"

export const metadata: Metadata = { title: "Replay" }

type Params = PageProps<"/play/[platform]/[sourceId]">["params"]

// Same pattern as the review page: params are request-time data, read in Suspense
export default function PlayPage({ params }: PageProps<"/play/[platform]/[sourceId]">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<ReviewSkeleton />}>
        <Replay params={params} />
      </Suspense>
    </div>
  )
}

async function Replay({ params }: { params: Params }) {
  const { platform, sourceId } = await params
  if (!isPlatform(platform)) notFound()
  return <ReplayGame gameId={`${platform}:${sourceId}`} />
}
