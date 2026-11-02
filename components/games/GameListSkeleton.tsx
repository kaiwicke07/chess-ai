export function GameListSkeleton({ header = true }: { header?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {header && (
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
      )}
      <div className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-7 animate-pulse rounded-md bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
