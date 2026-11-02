import Link from "next/link"
import { ChessKnight } from "lucide-react"

import { site } from "@/lib/site"

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChessKnight className="size-4" aria-hidden />
          </span>
          {site.name}
        </Link>
      </div>
    </header>
  )
}
