import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="text-sm text-muted-foreground">
          Check the address, or start from your games. Links to games only work in the browser that imported them.
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
        <Link href="/puzzles" className={buttonVariants({ variant: "outline" })}>
          Puzzles
        </Link>
      </div>
    </div>
  )
}
