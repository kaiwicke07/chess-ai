# chess.ai

A free chess improvement trainer. It pulls your Lichess or Chess.com games, analyzes them with Stockfish in the browser, and turns your mistakes into spaced-repetition puzzles, opening drills and replayable positions. No LLM, no paid services, no accounts: your data stays in your browser.

**Status:** Phase 1 (game import and sync). Features arrive phase by phase.

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm test
npm run lint
npm run build
```

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui on Base UI, deployed on Vercel.

## Credits

Move analysis by [Stockfish](https://github.com/official-stockfish/Stockfish), licensed under GPLv3.
