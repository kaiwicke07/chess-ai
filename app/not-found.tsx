import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

/**
 * The custom 404, set like a magazine page: a heavy rule, a display-type
 * headline, one sentence and one way forward.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col items-start gap-6 border-t border-border pt-6">
        <h1 className="font-display text-[clamp(3rem,11vw,6.5rem)] text-balance">This page doesn&apos;t exist</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-pretty">
          Check the address, or start from your games; links to games only work in the browser that imported them.
        </p>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Go home
        </Link>
      </div>
    </div>
  )
}
