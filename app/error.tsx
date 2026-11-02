"use client" // Error boundaries must be Client Components

import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"

/**
 * Shown when a page throws while rendering. Next 16 passes `retry`, which
 * re-fetches and re-renders the page. The thrown value isn't always an Error.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : null

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <TriangleAlert className="size-6 text-mistake" aria-hidden />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          This page hit an error. Your games and progress are stored separately and aren&apos;t affected.
        </p>
        {message && <p className="mt-2 font-mono text-xs text-muted-foreground">{message}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
    </div>
  )
}
