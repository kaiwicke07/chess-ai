"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const BASE =
  "flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3"
const IDLE = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"

/** Header link with no active state, for the static shell before the path is known. */
export function PlainNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(BASE, IDLE)}>
      {children}
    </Link>
  )
}

/**
 * Header link that shows which section you're in. It reads the path, which is
 * request-time data under Cache Components, so render it inside <Suspense>
 * with PlainNavLink as the fallback (see SiteHeader).
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(BASE, active ? "bg-muted text-foreground" : IDLE)}
    >
      {children}
    </Link>
  )
}
