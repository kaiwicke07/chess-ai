# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally (confirmed by the owner):

- **Club and online chess players** who play on Lichess or Chess.com and want to improve by studying their own games. They arrive with a username, import their recent games, and come back on later days for the daily puzzle and drill queue.
- **Visitors to the owner's portfolio** (recruiters, engineers, peers) evaluating the owner's engineering and product craft. They usually have no account to import, so the demo account (a grandmaster's public Lichess games) is their path in.

## Product Purpose

chess.ai turns a player's own mistakes into training. It imports their games, analyzes every move with Stockfish in the browser, and builds puzzles, opening drills and replays from where they actually went wrong, scheduled with spaced repetition. Success for a player is returning daily and seeing blunder rate fall; success for a portfolio visitor is understanding in seconds that this is a real, working, well-engineered product.

## Positioning

Everything runs in the visitor's browser and is free: no account, no server, no paid APIs, no language model. Training material comes only from the player's own games, and every explanation is built from engine facts (Stockfish lines replayed with chess.js), never generated prose. Classification follows Lichess's own published rules.

## Operating Context

- Entry: a Lichess or Chess.com username, or the demo account.
- Core loop: import and analyze games, review a game move by move, solve today's puzzle queue, drill opening weak spots, replay a lost game from its turning point, check progress over weeks.
- Analysis runs in a background Web Worker, so screens must handle partial, in-progress and empty data.
- Used on desktop for review and on phones for quick daily puzzles.

## Capabilities and Constraints

- Routes: `/` landing, `/u/[platform]/[username]` game library, `/review/...` review board, `/puzzles`, `/openings`, `/play/...` replay, `/progress`, `/about`, `/privacy`, `/terms`.
- Hard constraints from CLAUDE.md: $0 to run, all data in IndexedDB, explanations from engine facts only, works at phone width with 16px gutters and no horizontal scroll, deploys on Vercel Hobby.
- Stack is fixed: Next.js 16, React 19, Tailwind v4, shadcn/ui on Base UI, react-chessboard 5, Recharts 3.
- Move classifications (best, inaccuracy, mistake, blunder) need distinct colors kept apart from the brand color.
- Visual direction: see Brand Commitments (familiar, calm, dark).

## Brand Commitments

- Name: **chess.ai** (lowercase). Tagline: "Train on your own mistakes."
- Voice: plain, specific, factual. Copy names concrete mechanisms (FSRS, Stockfish, Lichess's rules) rather than making claims.
- License AGPL-3.0; the source link must stay offered to users.
- **Visual preference (owner, 2026-11-03):** simple, familiar and easy for anyone to use. Dark theme. Should sit alongside Chess.com (friendly, board-centric, clear buttons) and Notion/Apple (calm, generous spacing, readable). The owner rejected the bold "magazine cover" direction as too busy; convention is the commitment, executed with care, never dated. Do not imitate Chess.com branding (its green, logo or names).

## Evidence on Hand

- A working product with real output: analyses, puzzles, drills and charts generated from real games.
- A public demo account (`lichess/penguingim1`).
- No testimonials, user counts, press or benchmarks exist. Do not invent any.

## Product Principles

1. Your games, not generic content: every screen should point back to the player's own moves.
2. Honest by construction: show what the engine found, never more.
3. Respect the daily habit: the next thing to do is always obvious.
4. Prove it works: a portfolio visitor should see real output, fast.
