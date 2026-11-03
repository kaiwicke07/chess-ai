/** The site's absolute URL: the production domain on Vercel, localhost otherwise. */
export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000"

// Single source for the app's name, copy and links, so renaming is a one-line change.
export const site = {
  name: "chess.ai",
  tagline: "Train on your own mistakes.",
  description:
    "Pulls your Lichess or Chess.com games, analyzes every move with Stockfish in your browser, and turns your blunders into puzzles you'll remember.",
  /** This app's source: the AGPL asks that network users be offered it */
  sourceUrl: "https://github.com/kaiwicke07/chess-ai",
  /** Where to reach the maintainer (no personal email published) */
  contactUrl: "https://github.com/kaiwicke07/chess-ai/issues",
  stockfishSource: "https://github.com/official-stockfish/Stockfish",
  /** The exact stockfish.js release whose files are served from /stockfish (see scripts/copy-stockfish.mjs) */
  stockfishJsSource: "https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1",
  /** Date the privacy policy and terms last changed */
  legalUpdated: "November 2, 2026",
}
