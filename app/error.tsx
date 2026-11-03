"use client" // Error boundaries must be Client Components

import { Button } from "@/components/ui/button"

/**
 * Shown when a page throws while rendering. Next 16 passes `retry`, which
 * re-fetches and re-renders the page. The thrown value isn't always an Error.
 * Set like the 404: a display headline, one sentence and one action; the
 * header stays above it as the way out.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col items-start gap-6 border-t border-border pt-6">
        <h1 className="font-display text-[clamp(3rem,11vw,6.5rem)] text-balance">Something went wrong</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-pretty">
          This page hit an error, but your games and progress are stored separately and aren&apos;t affected.
        </p>
        {message && <p className="max-w-full font-mono text-xs break-words text-muted-foreground">{message}</p>}
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </div>
  )
}
