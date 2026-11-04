"use client"

import { useEffect, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { Check, ChevronDown, ClipboardCopy, ExternalLink, Share2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { gameToPgn, lichessAnalysisUrl } from "@/lib/chess/share"
import type { Color, Game } from "@/lib/types"

const ITEM =
  "flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"

/**
 * Ways to take the shown position or the whole game elsewhere. The review
 * page itself can't be shared (games live in this browser only), so the
 * link points at Lichess's free analysis board instead.
 */
export function ShareMenu({ game, fen, orientation }: { game: Game; fen: string; orientation: Color }) {
  const [copied, setCopied] = useState<string | null>(null)
  // Feature-detected after mount: the server render can't know about navigator.share
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setCanShare(typeof navigator.share === "function"), 0)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const link = lichessAnalysisUrl(fen, orientation)
  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => setCopied(what),
      () => setCopied("Couldn't copy"),
    )

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-best" role="status" aria-live="polite">
        {copied && (
          <span className="flex items-center gap-1">
            <Check className="size-3.5" aria-hidden /> {copied}
          </span>
        )}
      </span>
      <Menu.Root>
        <Menu.Trigger className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Share2 aria-hidden /> Share <ChevronDown aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="end">
            <Menu.Popup className="min-w-56 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
              {canShare && (
                <Menu.Item
                  className={ITEM}
                  onClick={() => void navigator.share({ title: `${game.white.name} vs ${game.black.name}`, url: link }).catch(() => {})}
                >
                  <Share2 aria-hidden /> Share this position…
                </Menu.Item>
              )}
              <Menu.Item className={ITEM} onClick={() => void copy(link, "Link copied")}>
                <ClipboardCopy aria-hidden /> Copy link to this position
              </Menu.Item>
              <Menu.LinkItem className={ITEM} href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open on Lichess analysis
              </Menu.LinkItem>
              <div role="separator" className="my-1 h-px bg-border" />
              <Menu.Item className={ITEM} onClick={() => void copy(fen, "FEN copied")}>
                <ClipboardCopy aria-hidden /> Copy FEN
              </Menu.Item>
              <Menu.Item className={ITEM} onClick={() => void copy(gameToPgn(game), "PGN copied")}>
                <ClipboardCopy aria-hidden /> Copy game PGN
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
