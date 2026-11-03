export function GameListSkeleton({ header = true }: { header?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {header && (
        <div className="flex flex-col gap-3">
          <div className="h-12 w-56 animate-pulse bg-muted" />
          <div className="h-4 w-64 animate-pulse bg-muted" />
        </div>
      )}
      {/* Same ruled index as the loaded list, so the page doesn't jump */}
      <div className="flex flex-col divide-y divide-border border-t-[3px] border-b border-border border-b-ink/20">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="size-9 animate-pulse bg-muted" />
            <div className="h-4 flex-1 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
