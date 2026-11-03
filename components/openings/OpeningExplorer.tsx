"use client"

import { useState } from "react"
import { ChevronLeft, Star } from "lucide-react"

import { ReviewBoard } from "@/components/board/ReviewBoard"
import { Button } from "@/components/ui/button"
import { formatEval, winPercentFor } from "@/lib/analysis/winProbability"
import { uciLineToSan } from "@/lib/chess/san"
import { movesByCount, pathSteps, type OpeningTree } from "@/lib/openings/buildTree"
import { MIN_LOSS } from "@/lib/openings/deviations"
import type { PositionEval } from "@/lib/types"

/** Win-% loss → text color, using the same bands as move judgements. */
function lossClass(loss: number): string {
  if (loss >= 15) return "text-blunder"
  if (loss >= 10) return "text-mistake"
  if (loss >= MIN_LOSS) return "text-inaccuracy"
  return "text-muted-foreground"
}

/**
 * Walks your opening tree: the board shows a position you've reached, the
 * table lists what was played from there and how it went. On your moves the
 * cost column shows how much win chance each choice gave up. Key by focus to
 * jump to a different starting node.
 */
export function OpeningExplorer({
  tree,
  evals,
  focus,
}: {
  tree: OpeningTree
  evals: Map<string, PositionEval>
  focus: string | null
}) {
  const [current, setCurrent] = useState(focus && tree.nodes.has(focus) ? focus : tree.root)
  const node = tree.nodes.get(current) ?? tree.nodes.get(tree.root)!
  const here = evals.get(node.key)
  const yourMove = node.toMove === tree.color

  // Breadcrumb: the route to this node, each step clickable
  const crumbs = pathSteps(node.path)

  const last = node.path.at(-1)
  const moves = movesByCount(node)
  const before = here ? winPercentFor(here.eval, node.toMove) : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] lg:items-start">
      <ReviewBoard
        position={{
          fen: node.fen,
          lastMove: last ? { san: "", uci: last, from: last.slice(0, 2), to: last.slice(2, 4), color: node.toMove } : null,
        }}
        orientation={tree.color}
      />

      <aside className="flex flex-col border-t border-border rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2.5 text-xs"
              onClick={() => setCurrent(crumbs.at(-2)?.key ?? tree.root)}
              disabled={current === tree.root}
            >
              <ChevronLeft aria-hidden /> Back
            </Button>
            <span className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{node.games}</span> {node.games === 1 ? "game" : "games"}
              {here && (
                <>
                  {" "}
                  · <span className="font-mono text-foreground tabular-nums">{formatEval(here.eval)}</span>
                </>
              )}
            </span>
          </div>
          {/* Breadcrumb: each step is a button back to that position; the current one is set in ink */}
          <p className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-sm">
            <button
              type="button"
              className="text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setCurrent(tree.root)}
            >
              Start
            </button>
            {crumbs.map((crumb) => (
              <button
                key={crumb.key}
                type="button"
                onClick={() => setCurrent(crumb.key)}
                className={`outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${crumb.key === current ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {crumb.label}
              </button>
            ))}
          </p>
        </div>

        {moves.length ? (
          <table className="text-sm">
            <thead className="text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">{yourMove ? "Your move" : "Their move"}</th>
                <th className="px-2 py-2 text-right font-semibold">Games</th>
                <th className="px-2 py-2 text-right font-semibold" title="Your score: wins plus half the draws">
                  Score
                </th>
                {yourMove && <th className="px-4 py-2 text-right font-semibold">Cost</th>}
              </tr>
            </thead>
            <tbody>
              {moves.map((move) => {
                const after = evals.get(move.next)
                const loss = yourMove && before !== null && after ? Math.max(0, before - winPercentFor(after.eval, node.toMove)) : null
                const { win, draw, loss: lost } = move.results
                const score = Math.round(((win + draw / 2) / (win + draw + lost)) * 100)
                const explorable = tree.nodes.has(move.next)
                return (
                  <tr key={move.uci} className="border-t border-border hover:bg-muted">
                    <td className="px-4 py-1.5">
                      <button
                        type="button"
                        disabled={!explorable}
                        onClick={() => setCurrent(move.next)}
                        className="flex items-center gap-1.5 font-mono font-semibold outline-none hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:font-normal disabled:hover:text-inherit"
                      >
                        {move.san}
                        {here?.best === move.uci && <Star className="size-3 fill-best text-best" aria-label="Stockfish's choice" />}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{move.count}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{score}%</td>
                    {yourMove && (
                      <td
                        className={`px-4 py-1.5 text-right font-mono tabular-nums ${loss === null ? "text-muted-foreground" : lossClass(loss)}`}
                      >
                        {loss === null ? "–" : loss < 1 ? "0%" : `−${Math.round(loss)}%`}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">Your games leave the opening tree here.</p>
        )}

        {yourMove && here?.best && !moves.some((m) => m.uci === here.best) && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <Star className="mr-1 inline size-3 fill-best text-best" aria-hidden />
            Stockfish prefers <span className="font-mono text-foreground">{uciLineToSan(node.fen, [here.best])[0]}</span>, which you haven&apos;t played here.
          </p>
        )}
      </aside>
    </div>
  )
}
