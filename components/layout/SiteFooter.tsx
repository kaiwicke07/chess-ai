import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
        Runs entirely in your browser. Analysis by{" "}
        <a
          href={site.stockfishSource}
          className="underline underline-offset-4 hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Stockfish
        </a>{" "}
        (GPLv3).
      </div>
    </footer>
  )
}
