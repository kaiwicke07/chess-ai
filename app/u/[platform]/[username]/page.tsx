import { Suspense } from "react"
import { notFound } from "next/navigation"

import { GameLibrary } from "@/components/games/GameLibrary"
import { GameListSkeleton } from "@/components/games/GameListSkeleton"
import { isPlatform, USERNAME_PATTERN } from "@/lib/sources/normalize"

type Params = PageProps<"/u/[platform]/[username]">["params"]

// With Cache Components, params are request-time data: the static shell renders
// the skeleton and the account content streams in once params resolve.
export default function AccountPage({ params }: PageProps<"/u/[platform]/[username]">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<GameListSkeleton />}>
        <Account params={params} />
      </Suspense>
    </div>
  )
}

async function Account({ params }: { params: Params }) {
  const { platform, username } = await params
  if (!isPlatform(platform) || !USERNAME_PATTERN.test(username)) notFound()
  return <GameLibrary platform={platform} username={username} />
}
