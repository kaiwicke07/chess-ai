import { Suspense } from "react"
import { notFound } from "next/navigation"

import { GameReview, ReviewSkeleton } from "@/components/board/GameReview"
import { isPlatform } from "@/lib/sources/normalize"

type Params = PageProps<"/review/[platform]/[sourceId]">["params"]

// Same pattern as the account page: params are request-time data under
// Cache Components, so they are read inside a Suspense boundary.
export default function ReviewPage({ params }: PageProps<"/review/[platform]/[sourceId]">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<ReviewSkeleton />}>
        <Review params={params} />
      </Suspense>
    </div>
  )
}

async function Review({ params }: { params: Params }) {
  const { platform, sourceId } = await params
  if (!isPlatform(platform)) notFound()
  return <GameReview gameId={`${platform}:${sourceId}`} />
}
