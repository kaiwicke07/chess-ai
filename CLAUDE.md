# chess.ai: personal chess improvement trainer

@AGENTS.md

A portfolio project for the owner's personal website. It imports the user's Lichess or Chess.com games, analyzes every move with Stockfish **in the browser**, and turns mistakes into training: puzzles with spaced repetition, an opening trainer, replays of critical positions and a progress dashboard.

## Hard constraints

- **$0 to run.** No LLM, no paid services, no accounts, no database server. (An earlier plan used the Claude API and Upstash; both were dropped deliberately. Don't reintroduce them.)
- **All user data lives in the browser** (IndexedDB via Dexie). Phase 10 adds JSON export/import as the backup.
- **Explanations come from engine facts only.** Text is template-based and built from Stockfish's lines plus what chess.js observes when replaying them. Never claim anything the engine lines don't show.
- **Clean, modern dark UI** that works at phone width (16px gutters, no horizontal scroll).
- Deploys on **Vercel** (Hobby plan, free).

## Working style the owner asked for

- **Build one phase at a time.** Finish, verify, and stop; don't start the next phase until asked.
- **Explain the key decisions**, so the owner understands the code. At the end of each phase, summarize what was built, how it works (a file table), and the decisions worth understanding.
- **Commit only when asked.** Messages follow the existing style: an imperative subject, a "Phase N: ..." body with bullets, and the attribution trailer. On Windows PowerShell 5.1, a commit message containing double quotes breaks `git commit -m`, so write it to a temp file and use `git commit -F <file>`.
- **Verify each phase:** `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build`, plus a real check in the browser. Run `npx next typegen` after adding routes so `PageProps<...>` types exist.
- **Match the surrounding code:** short JSDoc on exported functions, comments that explain *why*, no semicolons in app code, Tailwind classes, and shadcn components from `components/ui`.

## Commands

```bash
npm install        # postinstall copies Stockfish into public/stockfish/
npm run dev        # http://localhost:3000
npm test           # vitest run (tests/**/*.test.ts)
npm run lint
npm run build
npx next typegen   # regenerate route types after adding routes
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.4** (App Router, Turbopack, `cacheComponents` + `partialPrefetching` on), React 19.3, TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/turbopack`), shadcn/ui on **Base UI** (`@base-ui/react`); class merging via shadcn's `cn` package |
| Chess | chess.js 1.4 (rules, PGN, SAN), react-chessboard **5.x** (single `options` prop) |
| Engine | `stockfish` npm package **pinned to 19.0.1**, lite single-threaded WASM (~1.8 MB) in a Web Worker |
| Storage | Dexie 4 + dexie-react-hooks (`useLiveQuery`) |
| Validation | Zod 4 (external API responses) |
| Charts | Recharts 3 |
| Tests | Vitest 5 (`vitest.config.mts`, `@` alias mirrors tsconfig) |
| Spaced repetition | ts-fsrs 6 (Phase 6) |
| State | Plain React state plus `useLiveQuery` so far. Add Zustand only if components really need shared state. |

## Architecture as built

- **Routes:**
  - `/` is the landing page: `UsernameForm`, and `RecentAccounts` from Dexie.
  - `/u/[platform]/[username]` is the game list, sync and analysis queue (`components/games/GameLibrary.tsx`).
  - `/review/[platform]/[sourceId]` is the review board (`components/board/GameReview.tsx`). The game id is `${platform}:${sourceId}`.
  - `/puzzles` is the puzzle trainer (static page; all data comes from Dexie). It's linked from the header nav.
- **No server code.** The browser fetches Lichess and Chess.com directly; both send `Access-Control-Allow-Origin: *`. The planned `/api/games` proxy was dropped. Lichess rate-limits per IP, so proxying would pool every visitor's limit, and Lichess also rejects some non-browser User-Agents.
- **Data model:** see `lib/types.ts`.
  - **`Game`:** SAN moves from the standard start, and `clocks` (ms remaining after each ply, aligned with `moves`, or null). The result is from the user's side. `account` is `platform:lowercased-username`.
  - **`Eval`:** always from white's point of view: `{kind:"cp"}`, `{kind:"mate", moves}` (positive means white mates) or `{kind:"checkmate", winner}`.
  - **`PositionEval`:** `{key, depth, eval, best, pv}`, with moves in UCI notation.
  - **`GameAnalysis`:** a marker that every position of the game has an eval at `ANALYSIS_DEPTH`.
- **Dexie schema** (`lib/db/schema.ts`):
  - v1: `games` (`id, [account+playedAt]`) and `accounts`.
  - v2: `evals` (keyed by position key) and `analyses` (`gameId`).
  - Add new tables as new `this.version(n)` blocks; never edit old versions.
- **Position key** (`lib/chess/positionKey.ts`): the first 4 FEN fields, without move counters. Evals are cached **per position**, so shared openings are analyzed once. Reuse this key for the Phase 7 opening tree.
- **Sources** (`lib/sources/`):
  - Each adapter normalizes and Zod-validates records, and skips variants, correspondence/daily games, UltraBullet and games under 2 plies.
  - **Sync:** the first sync imports the newest 100 games; after that, only games newer than the newest stored one (`since` is inclusive, hence the +1). Writes are idempotent upserts by id.
  - Lichess streams NDJSON. Chess.com walks the monthly archives newest first, and its opening names come from the ECO URL slug.
- **Engine** (`lib/engine/`):
  - `engine.ts` is the UCI wrapper: serialized searches, cancellable with an `AbortSignal`, and `analyze(fen, {depth, multiPv})` returns the deepest line for each MultiPV.
  - `analyzeGame.ts`: `ANALYSIS_DEPTH = 14` for every game, so stats stay comparable. It converts scores to white's point of view and scores terminal positions without the engine.
  - `queue.ts` is a background singleton: one game at a time, each position written to Dexie as soon as it's done. `prioritize(gameId)` pauses the current game and runs this one next. It's exposed through `useAnalysisQueue` (`useSyncExternalStore`).
  - `useGameEvals(gameId, positions)` returns the live evals in ply order, and prioritizes the game if it isn't fully analyzed.
- **Helpers:**
  - `lib/chess/positions.ts`: `replayMoves` returns `positions[i]` = the position after i plies, and `clocksAt` returns each side's clock at a ply.
  - `lib/chess/san.ts`: `uciLineToSan` and `numberMoves`.
  - `lib/analysis/winProbability.ts`: `winPercent` (Lichess formula, cp clamped to ±1000) and `formatEval`.
  - `lib/format.ts`: time controls, clocks, outcome and score formatting, `SPEED_LABELS`.
- **Theme tokens** (`app/globals.css`, dark-only via `class="dark"` on `<html>`):
  - Brand: violet primary.
  - Classifications: `best`, `inaccuracy`, `mistake`, `blunder`, used as `text-blunder`, `bg-blunder/10`, etc.
  - Board: `board-light`, `board-dark`.
  - Keep classification colors distinct from the brand color.
- **Stockfish asset:**
  - `scripts/copy-stockfish.mjs` (postinstall) copies `stockfish-19-lite-single.{js,wasm}` and `COPYING.txt` to `public/stockfish/`, which is gitignored and ESLint-ignored.
  - `ENGINE_URL` in `engine.ts` hardcodes that file name. That's why the package version is pinned.
  - The footer links to the GPLv3 license.

## Gotchas learned the hard way

- **Next 16 + Cache Components:** route `params` are request-time data. Read them inside a `<Suspense>` boundary, in an async child component (see both route pages). A `notFound()` there returns HTTP 200 with the not-found UI, because the shell has already streamed.
- **Next 16 keeps the previous route mounted but hidden** (Activity). `document.querySelector` in browser tests can match elements from hidden pages, so filter by `offsetParent`.
- **React Compiler lint rules** (eslint-config-next 16):
  - No synchronous `setState` in an effect body. Call functions that only set state in promise callbacks (see `runSync` in `GameLibrary`).
  - No reassigning variables inside render callbacks such as `.map`. Move that logic into pure helpers (see `numberMoves`).
- **Tailwind v4 only emits theme variables for classes actually used.** Don't reference `var(--color-neutral-500)` from JS; use the app tokens (`--foreground`, `--muted-foreground`, `--board-*`, ...).
- **Lichess games export:** `clocks` can have one extra trailing entry (trim to the move count). Status `timeout` means the player left (mapped to `abandoned`); `outoftime` means they flagged. curl's default User-Agent gets 404 from `/api/games/user`.
- **Browser fetch can't set `User-Agent`,** and custom headers trigger a CORS preflight. Send no custom headers to Chess.com.
- **React Strict Mode runs effects twice in dev.** The queue marks a game current as soon as it's dequeued so it isn't analyzed twice. Keep request dedupe in mind for new background work.
- **Win % has two variants.** For "the mover's win chance", use `winPercentFor(eval, color)`: black's chance is `100 − white's`. For mover-side display, use `evalFor`. Classification needs uncapped `winningChances`; see Phase 4.
- **In-app Browser pane testing:** the pane hides itself again between turns. While the pane is hidden, `requestAnimationFrame` never fires, so a full page reload won't hydrate and Suspense content isn't revealed. Show the pane (`mcp__ccd_view__show_pane` with `preview`) before testing, or navigate client-side from `/`.
- **PowerShell `ConvertTo-Json`/`Set-Content`** writes a BOM and reformats JSON, which broke `package.json` once. Edit JSON with a Node one-liner instead.
- **Browser-tool scripts time out after 45 s.** For long background work, start it, then poll in short calls. A full page load kills the queue's worker, so keep background work running by navigating client-side (header nav, links).
- **Measured engine speed (depth 14):** about 115 ms per position in Node and about 200 ms in the browser, so 10–30 s per game. A 158-ply game took about 35 s.

## Phase plan and progress

| # | Phase | Status |
|---|---|---|
| 0 | Scaffold and deploy: Next.js, Tailwind, shadcn, dark theme, own git repo | ✅ Done (`8915f21`). Vercel deploy is the owner's step; not pushed yet |
| 1 | Fetch and sync games: both platforms, clocks, openings, new-games-only sync, game list | ✅ Done (`4ee2c92`) |
| 2 | Review board: step through moves, keyboard (←→↑↓, Home/End, F flips), move list, clocks | ✅ Done (`b1b3210`) |
| 3 | Stockfish analysis: worker wrapper, background queue, eval bar and graph, engine line, per-position cache | ✅ Done (`c9bea62`) |
| 4 | Classification and explanations: Lichess-faithful judgements and accuracy, arrows, badges, template explanations | ✅ Done ("Flag mistakes..." commit) |
| 5 | Puzzle generator and solver: MultiPV-2 uniqueness, multi-move lines, themes, `/puzzles` solver, links to and from the review | ✅ Done ("Generate puzzles..." commit) |
| 6 | Spaced repetition: ts-fsrs scheduling, auto-grading, daily queue, persistent review log, header badge | ✅ Done ("Schedule puzzles with spaced repetition" commit) |
| 7 | **Opening trainer** | ⏭ Next |
| 8 | Replay mode vs Stockfish | Planned |
| 9 | Progress dashboard | Planned |
| 10 | Polish and ship | Planned |

### Phase 4: classification and explanations (done)

**As built:**
- `lib/analysis/classify.ts`: `judge()` and `assessMoves()` are ports of lila `Advice.scala`.
- `lib/analysis/accuracy.ts`: `moveAccuracy()` and `gameAccuracy()` are ports of lila `AccuracyPercent.scala`.
- `lib/explain/facts.ts` and `templates.ts` hold the facts and explanations; `lib/chess/material.ts` the material counting.
- `components/review/` holds `MoveFeedback`, `AccuracySummary` and `judgementStyles`. Badges are in `MoveList`, dots in `EvalGraph`, arrows via `ReviewBoard`.

**Facts learned while porting:**
- `winPercent` caps cp at ±1000, and mates count as ±1000 (≈97.5%, not 100). But move *judgements* use **uncapped** `winningChances` (−7.27 → −18.92 is an inaccuracy).
- Lichess's exported analysis starts after move 1; tests assume a +0.15 start (legacy initial).
- `tests/classify.test.ts` feeds Lichess's own evals for 3 real games (`tests/fixtures/lichess-analysed.json`) through the port and requires Lichess's exact judgements and accuracy within ±1. Keep this test passing.

**Against our own depth-14 evals:**
- On 3 real games, accuracy was within 1–5 points of Lichess's server analysis, and every Lichess blunder was flagged by us as a blunder or a mistake.
- The differences are borderline inaccuracies or a single step in severity, from the shallower, lite engine.

**Explanation wording rule:** the short forms ("hangs the knight on e6 to fxe6", "Bxc6+ would have won a piece") are used only when that single capture equals the net material change. Otherwise the line is shown, so trades aren't misdescribed.

The original spec follows for reference.

**Goal:** flag each move as inaccuracy, mistake or blunder; show per-player accuracy; draw best-move and played-move arrows; write a short explanation built from engine facts. Everything is computed from the evals Phase 3 already caches, with no new engine work.

**Build:**
- **`lib/analysis/classify.ts`** (pure, tested):
  - For ply i (the move from position i to i+1), compute the mover's win % before (`evals[i]`) and after (`evals[i+1]`), both from the mover's side.
  - **Thresholds:** a drop of ≥5 points is an inaccuracy, ≥10 a mistake, ≥15 a blunder. This matches Lichess's 0.1/0.2/0.3 on its −1..1 scale.
  - **Mates:** handle missed mate and allowed mate explicitly. Positions that are already decided shouldn't flag because both sides are near 0 or 100. Mark "best" when the played move equals `evals[i].best`.
  - Return a per-ply classification, or null for the start position.
- **`lib/analysis/accuracy.ts`:**
  - Per-move accuracy is Lichess's `103.1668 * exp(-0.04354 * winDrop) - 3.1669`, clamped to 0–100 (lichess.org/page/accuracy).
  - Game accuracy per player is Lichess's combination of a volatility-weighted mean and a harmonic mean. Read the page and implement it faithfully, or document any simplification.
- **`lib/explain/facts.ts`:**
  - Replay the engine lines with chess.js and record material changes, captures, checks and mates.
  - **Refutation line:** the PV from the position *after* the user's move (`evals[i+1].pv`).
  - **Better line:** `evals[i].pv`.
  - Detect a hung piece from material lost along the refutation line, not from a static attack count.
- **`lib/explain/templates.ts`,** in priority order:
  1. Allowed mate: "This allows mate in 2: Qh7+ Kf8, Qh8#."
  2. Missed mate: "You missed mate in 1: Qxf7#."
  3. Hangs material: "This hangs your knight on e5 to Nxe5."
  4. Missed material: "Bxc6 would have won a pawn."
  5. Fallback, evals only: "Stockfish prefers Nd2. Your move drops the eval from +1.2 to −0.8."

  Never claim more than the lines show.
- **UI:**
  - Classification badges in `MoveList`: `??`, `?`, `?!` in the classification colors.
  - Arrows via react-chessboard `options.arrows` (`{startSquare, endSquare, color}`): best move in `best` green and the played move in the classification color, on flagged moves.
  - The explanation for the current move in the side panel.
  - Per-player accuracy and inaccuracy/mistake/blunder counts in the review panel.
  - Optional: dots on the eval graph at blunders.
- **Tests:** classification thresholds, mate edge cases, accuracy formula, fact extraction and template selection, using hand-made FENs and evals.

**Done when:** blunders are flagged with lines like "This hangs your knight to Nxe5", and the flags broadly match Lichess's own analysis on a few test games.

### Phase 5: puzzles (done)

**Generation and data:**
- **Where it runs:** `lib/puzzles/generate.ts` runs as phase 2 of each game in the analysis queue, after the evals.
- **Search:** each user mistake or blunder gets a depth-18 MultiPV-2 search, about 1.5–2 s each in the browser.
- **Kept when:** the best move beats the second by ≥15 win %, or it's the only mate.
- **Extended:** to up to 3 user moves, only while the user's win chance is ≥70% and no material has been cashed in yet.
- **Rejected:** only-move positions and cases where a deeper search agrees with the game move.
- **Storage:** Dexie v3 `puzzles` table. Ids are `${gameId}:${ply}`, where ply is the start position, the one before the user's move.
- **Completion:** `analyses.puzzleVersion` marks a game as scanned, and `isComplete()` in `lib/db/schema.ts` needs both the evals depth and `PUZZLE_VERSION`. **Bump `PUZZLE_VERSION`** after changing the rules, and every game gets rescanned.

**Themes** (`lib/puzzles/themes.ts`): `mate` (with `mateIn`), `fork`, `hangingPiece`, `material`, then `advantage` or `defense`. The last two are fallbacks, chosen by the user's win chance after the best move (≥60 means `advantage`).

**Solving and UI:**
- `lib/puzzles/solve.ts` is a pure state machine with an outcome of `clean`, `hinted`, `retried` or `failed`. Phase 6 maps these to FSRS grades.
- Any checkmating move is accepted. The board auto-queens, which also counts for an underpromotion.
- **UI:** `components/puzzles/PuzzleSolver.tsx` (drag or click-to-move, auto-reply, hint, show solution) and `PuzzleTrainer.tsx` (the `/puzzles` page, theme filters). Results are session-only until Phase 6.
- **Links:** `/puzzles#<puzzleId>` selects a puzzle. `/review/...#ply=N` opens a game at a move. The review's feedback panel links "Practice this position" on moves that became puzzles.

### Phase 6: spaced repetition (done)

**Scheduler** (`lib/srs/scheduler.ts`): ts-fsrs **6.0** at `request_retention: 0.9` with fuzz on.
- **Learning steps:** `learning_steps` and `relearning_steps` are both `["10m"]`.
- **Resulting intervals for a new card:** Again 10 min, Hard 15 min, Good about 2 days, Easy about 8 days. A miss comes back in the same session; a correct solve goes straight to days.
- **Why one step:** the default `["1m","10m"]` would repeat a just-solved puzzle 10 minutes later.

**Grading** (`lib/srs/grading.ts`) is automatic, from the Phase 5 outcome:

| Outcome | Grade |
|---|---|
| Failed (showed the solution) | Again |
| Hinted or retried | Hard |
| Clean | Good |
| Clean and ≤ 10 s per user move | Easy |

The spec's "wrong move = Again" was read as a failed attempt, since a retry is a wrong move followed by a solve.

**Storage:** Dexie v4.
- `cards` (`ReviewCard`) has id `puzzle:${puzzleId}` and is indexed by `due` in ms. The ts-fsrs card is stored as-is (Dates survive IndexedDB).
- `reviews` (`ReviewLog`) is an append-only log of every attempt: outcome, grade, duration, next due. It's the source for Phase 9 stats.
- `recordAttempt()` (`lib/srs/record.ts`) writes the card and the log entry in one transaction.
- Every attempt counts, including free practice before a card is due. Cards for regenerated-away puzzles are ignored.
- `ReviewCard.kind` already allows `"opening"`. **Phase 7 should reuse the same scheduler and tables** for opening drills.

**Daily queue** (`lib/srs/dailyQueue.ts`): due cards first, most overdue first, then up to `NEW_PER_DAY = 10` never-attempted puzzles. The day starts at local midnight.

**UI:**
- `/puzzles` has a **Today** mode (the queue, an "Up next" list, a done-for-today state) and an **All puzzles** mode (free practice with theme filters, each card's schedule shown).
- After an attempt the solver shows "Graded Easy · next review in 9 days".
- The header's `PuzzlesDueBadge` shows today's count.

**`lib/useNow.ts`:** a ticking clock that starts at 0 and is set after mount. Use it rather than `Date.now()` in render; React's purity lint forbids that.

### Later phases (design already agreed)

- **5. Puzzle generator** (done, see above):
  - **Candidates:** the position before each user mistake or blunder; the answer is Stockfish's best move.
  - **Uniqueness:** re-analyze the candidates at about depth 18 with MultiPV 2. Keep a candidate only if move 1 beats move 2 by at least ~15 win-% points (this also drops positions already decided).
  - **Multi-move:** extend while the next user move is still unique, up to 3 user moves. Any mating move counts as correct.
  - **Themes:** tag mate-in-N, hanging piece, fork and material win in code.
  - Add a Dexie `puzzles` table and a solving UI.
- **6. Spaced repetition:**
  - ts-fsrs; tables `cards` (FSRS state for each puzzle or opening node) and `reviews` (one row per attempt: grade, time, date).
  - **Auto-grading:** wrong move = Again, solved after a hint or retry = Hard, solved = Good, solved fast = Easy.
  - **Daily queue:** due cards plus a cap of about 10 new ones.
- **7. Opening trainer:**
  - A tree keyed by position key from the user's own games, up to about ply 20, for the user's color.
  - **Deviations:** positions reached at least twice where the user's move lost ≥5 win % against the best move, ranked by frequency × cost.
  - **Acceptable moves:** within ~3 win % of the best.
  - **Drill:** the trainer plays the opponents' most common replies; weak nodes become FSRS cards. Uses the cached evals; no external opening API.
- **8. Replay mode:**
  - Start from the position before the biggest win-% drop in a lost game, or from "Play from here" on any review position.
  - The opponent is a second engine instance using `UCI_Elo` / `Skill Level`. Run a quick analysis after the game.
- **9. Progress dashboard:**
  - Store raw events and compute stats at view time.
  - **Weekly trends:** blunder rate per 100 moves, accuracy, puzzle accuracy.
  - **Weaknesses:** by opening, by phase (opening ≤ ply 20, endgame by low material, middlegame otherwise) and by time pressure (<10% of the starting time or <30 s).
  - Backfilled from game history.
- **10. Polish and ship:**
  - JSON backup export/import (`lib/db/backup.ts`).
  - Empty and error states, mobile pass, an About/credits page with the Stockfish license.
  - A quick vs deep analysis toggle, README with an architecture diagram, social preview image, a demo username.

## Open notes

- The name "chess.ai" is a placeholder (it no longer uses AI). It's defined only in `lib/site.ts`.
- Opening names differ by platform: Lichess gives "Sicilian Defense: Najdorf Variation", Chess.com's slug "Sicilian Defense Canal Attack". Normalize them (for example by ECO) before grouping in Phase 9.
- `components/ui/tabs.tsx` is installed but unused so far.
